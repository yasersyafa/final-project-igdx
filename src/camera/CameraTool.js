// CameraTool — the new core loop.
// Two states: IDLE (camera lowered, world at 1x, HUD shown) and AIMING (camera
// raised, world ZOOMED so vision is limited to the frame, HUD hidden). The world
// is zoomed by scaling scene.world (a container); screen-space overlays/HUD are NOT
// in that container so they stay crisp and unscaled.
// In AIMING: move to look around, click to shoot, keep shooting. Toggle with Space
// / right-click. Confirm (UI) is only reachable in IDLE.
import Phaser from 'phaser';
import { EVENTS } from '../config/events.js';
import { CONFIG, WORLD } from '../config/gameConfig.js';
import { createStateMachine } from '../core/stateMachine.js';
import { FONTS } from '../config/fonts.js';
import { EASE, DUR } from '../anim/motion.js';
import { playFlash, playMiss } from './CaptureFeedback.js';
import { t } from '../core/i18n.js';
import { DEBUG } from '../config/debug.js';

const STATES = ['INTRO', 'IDLE', 'AIMING'];

export class CameraTool {
  constructor(scene, bus, levelData) {
    this.scene = scene;
    this.bus = bus;
    this.world = scene.world; // zoomable container holding bg + PhotoObjects
    this.objects = (levelData && levelData.objects) || []; // for the debug gizmo's per-object centroid dots
    this.fw = CONFIG.FRAME_SIZE.width;
    this.fh = CONFIG.FRAME_SIZE.height;

    // Zoom factor: frame height fills the screen height -> vision limited to frame.
    this.Z = WORLD.height / this.fh;            // 720/270 = 2.667
    this.stripW = this.fw * this.Z;             // 360*2.667 = 960
    this.barW = (WORLD.width - this.stripW) / 2; // 160 each side
    this.screenC = { x: WORLD.width / 2, y: WORLD.height / 2 };

    // Optical zoom multiplier (buttons: 0.5x/1x/2x). Always resets to 1x on raise().
    // The screen strip size never changes; the multiplier changes how much of the
    // WORLD that fixed strip shows (effZ = this.Z * zoomMult), i.e. real camera zoom.
    this.zoomLevels = [0.5, 1, 2];
    this.zoomMult = 1;
    this.zAnim = this.Z; // animated effZ actually applied to the world each frame

    // aim point (world coords), clamped so the frame stays inside the world.
    this.aim = { x: WORLD.width / 2, y: WORLD.height / 2 };
    this.aimTarget = { ...this.aim };
    this._recomputeAimRange();

    this.sm = createStateMachine('INTRO', STATES);
    this._photoCount = 0;
    this.rollCount = 0; // photos currently in the roll (capped at CONFIG.MAX_PHOTOS)
    this._hintDefault = t('camera.hint');

    this._buildOverlay();
    this._buildDebugGizmo();
    this._wireInput();
    this._wireBus();
    this._wireStates();
  }

  // DEBUG.frameGizmo — draws frameBounds (the exact rect fed into evaluate()) and the
  // aim point in WORLD space. Child of `this.world`, so it pans/scales with the world
  // for free and always lines up with what's actually being captured.
  _buildDebugGizmo() {
    if (!DEBUG.frameGizmo) return;
    this.gizmo = this.scene.add.graphics();
    this.world.add(this.gizmo);
  }

  _drawDebugGizmo() {
    if (!this.gizmo) return;
    const g = this.gizmo;
    g.clear();
    if (!this.sm.is('AIMING')) return;

    // Per-object "perfect" point — the bbox centroid that centering() in
    // FramingScorer.js measures distance from. Yellow = mission target, gray = other.
    this.objects.forEach((o) => {
      const cx = o.bbox.x + o.bbox.w / 2, cy = o.bbox.y + o.bbox.h / 2;
      g.fillStyle(o.mission ? 0xffff00 : 0x999999, 1).fillCircle(cx, cy, o.mission ? 5 : 4);
      g.lineStyle(1, 0x000000, 0.6).strokeCircle(cx, cy, o.mission ? 5 : 4);
    });

    const fb = this.frameBounds;
    g.lineStyle(2, 0xff00ff, 1).strokeRect(fb.x, fb.y, fb.w, fb.h);
    g.fillStyle(0x00ff00, 1).fillCircle(this.aim.x, this.aim.y, 4);
  }

  // ---- overlay (screen-space; never scaled by the world zoom) ---------------
  _buildOverlay() {
    const s = this.scene;
    const W = WORLD.width, H = WORLD.height;
    // Letterbox bars that crop the zoomed world down to the frame's aspect.
    this.barL = s.add.rectangle(0, 0, this.barW, H, 0x000000, 1).setOrigin(0, 0).setDepth(800);
    this.barR = s.add.rectangle(W - this.barW, 0, this.barW, H, 0x000000, 1).setOrigin(0, 0).setDepth(800);
    // Camera frame border around the visible strip.
    this.frame = s.add.rectangle(this.barW, 0, this.stripW, H, 0x000000, 0).setOrigin(0, 0)
      .setStrokeStyle(3, 0xffffff, 0.85).setDepth(801);
    // Corner accents at the strip edges.
    this.corners = s.add.graphics().setDepth(801);
    this._drawCorners();
    // Rule-of-thirds grid (9 cells) inside the strip.
    this.grid = s.add.graphics().setDepth(801);
    this._drawGrid();
    // Center focus dot.
    this.dot = s.add.circle(W / 2, H / 2, 3, 0xffffff, 0.7).setDepth(801);
    // "REC"-ish hint.
    this.hint = s.add.text(16, 14, this._hintDefault, {
      fontFamily: FONTS.body, fontSize: '14px', color: '#ffffff',
    }).setDepth(801).setAlpha(0.8);

    this._buildZoomIndicators(); // pushes into this.overlay, so it fades with the rest

    this.overlay = [this.barL, this.barR, this.frame, this.corners, this.grid, this.dot, this.hint, ...this.zoomIndicators];
    this._setOverlayAlpha(0); // hidden until AIMING
  }

  // Zoom level indicator (0.5x/1x/2x), screen-space, bottom-center of the frame.
  // Visual only — no input, changed with W/S. Hidden for the instant of a snapshot
  // so it never gets baked into the captured photo (see _shoot()).
  _buildZoomIndicators() {
    const s = this.scene;
    const BW = 44, BH = 26, GAP = 6;
    const n = this.zoomLevels.length;
    const totalW = n * BW + (n - 1) * GAP;
    const startX = WORLD.width / 2 - totalW / 2 + BW / 2;
    const y = WORLD.height - 34;
    this.zoomIndicators = this.zoomLevels.map((z, i) => {
      const c = s.add.container(startX + i * (BW + GAP), y).setDepth(802);
      const bg = s.add.rectangle(0, 0, BW, BH, 0x2b2f38, 0.7).setStrokeStyle(1, 0xffffff, 0.5);
      const txt = s.add.text(0, 0, `${z}x`, {
        fontFamily: FONTS.body, fontSize: '13px', color: '#ffffff',
      }).setOrigin(0.5);
      c.add([bg, txt]);
      c.zoomValue = z;
      c.bg = bg;
      return c;
    });
    this._highlightZoomIndicator();
  }

  _highlightZoomIndicator() {
    this.zoomIndicators.forEach((c) => {
      c.bg.setFillStyle(c.zoomValue === this.zoomMult ? 0x5c8a52 : 0x2b2f38, 0.7);
    });
  }

  _setZoomIndicatorsVisible(v) {
    this.zoomIndicators.forEach((c) => c.setVisible(v));
  }

  // Viewfinder chrome (corners, rule-of-thirds grid, center dot, hint text) sits
  // inside the captured rect at full alpha throughout AIMING, so it must be
  // hidden for the instant of a snapshot too, same reasoning as the zoom
  // indicators above.
  _setViewfinderChromeVisible(v) {
    [this.corners, this.grid, this.dot, this.hint].forEach((o) => o.setVisible(v));
  }

  // Frame stays fully inside the world (never shows background past a world edge).
  _recomputeAimRange() {
    const efw = this.fw / this.zoomMult, efh = this.fh / this.zoomMult;
    this.aimRange = {
      minX: efw / 2, maxX: WORLD.width - efw / 2,
      minY: efh / 2, maxY: WORLD.height - efh / 2,
    };
  }

  get effZ() { return this.Z * this.zoomMult; }

  // Change zoom level (0.5x/1x/2x). Re-clamps aim to the new effective frame size,
  // and tweens the world scale (zAnim) to the new effZ instead of snapping —
  // _update() applies zAnim every frame, so this animates smoothly mid-AIMING.
  setZoom(mult) {
    if (this.zoomMult === mult) return;
    this.zoomMult = mult;
    this._recomputeAimRange();
    this._highlightZoomIndicator();
    this.aimTarget.x = Phaser.Math.Clamp(this.aimTarget.x, this.aimRange.minX, this.aimRange.maxX);
    this.aimTarget.y = Phaser.Math.Clamp(this.aimTarget.y, this.aimRange.minY, this.aimRange.maxY);
    this.aim.x = Phaser.Math.Clamp(this.aim.x, this.aimRange.minX, this.aimRange.maxX);
    this.aim.y = Phaser.Math.Clamp(this.aim.y, this.aimRange.minY, this.aimRange.maxY);
    if (this.sm.is('AIMING')) {
      if (this._zoomTween) this._zoomTween.stop();
      this._zoomTween = this.scene.tweens.add({
        targets: this, zAnim: this.effZ, ease: EASE.inOut, duration: DUR.base,
      });
    } else {
      this.zAnim = this.effZ;
    }
  }

  // W = zoom in one level, S = zoom out one level, stepping through zoomLevels.
  _stepZoom(dir) {
    const idx = this.zoomLevels.indexOf(this.zoomMult);
    const next = Phaser.Math.Clamp(idx + dir, 0, this.zoomLevels.length - 1);
    this.setZoom(this.zoomLevels[next]);
  }

  _drawCorners() {
    const g = this.corners;
    g.clear();
    g.lineStyle(3, 0xffffff, 0.95);
    const x0 = this.barW, x1 = WORLD.width - this.barW, y0 = 0, y1 = WORLD.height;
    const L = 26, pad = 8;
    const seg = (x, y, sx, sy) => { g.beginPath(); g.moveTo(x, y + sy * L); g.lineTo(x, y); g.lineTo(x + sx * L, y); g.strokePath(); };
    seg(x0 + pad, y0 + pad, 1, 1); seg(x1 - pad, y0 + pad, -1, 1);
    seg(x0 + pad, y1 - pad, 1, -1); seg(x1 - pad, y1 - pad, -1, -1);
  }

  _drawGrid() {
    const g = this.grid;
    g.clear();
    g.lineStyle(1, 0xffffff, 0.3);
    const x0 = this.barW, x1 = WORLD.width - this.barW, y0 = 0, y1 = WORLD.height;
    const w = x1 - x0, h = y1 - y0;
    for (let i = 1; i <= 2; i++) {
      const x = x0 + (w * i) / 3;
      g.beginPath(); g.moveTo(x, y0); g.lineTo(x, y1); g.strokePath();
      const y = y0 + (h * i) / 3;
      g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.strokePath();
    }
  }

  _setOverlayAlpha(a) { this.overlay.forEach((o) => o.setAlpha(o === this.hint ? a * 0.8 : a)); }

  // ---- input ----------------------------------------------------------------
  _wireInput() {
    const s = this.scene;

    // Pointer-locked RELATIVE movement (not absolute position) — the real cursor is
    // captured by the browser and can never wander off the canvas, so aiming can't
    // get "stuck" the way absolute cursor-position mapping used to (see raise()/lower()).
    s.input.on('pointermove', (p) => {
      if (!this.sm.is('AIMING')) return;
      const scale = s.scale.displayScale; // device px -> game px, so pan speed is resolution-independent
      this.aimTarget.x = Phaser.Math.Clamp(this.aimTarget.x + p.movementX * scale.x, this.aimRange.minX, this.aimRange.maxX);
      this.aimTarget.y = Phaser.Math.Clamp(this.aimTarget.y + p.movementY * scale.y, this.aimRange.minY, this.aimRange.maxY);
    });

    // If the browser drops pointer lock on its own (native ESC, alt-tab, etc.) while
    // still AIMING, follow suit — otherwise movementX/Y goes dead and aiming freezes.
    this._onPointerLockChange = (event, locked) => {
      if (!locked && this.sm.is('AIMING')) this.lower();
    };
    s.sys.game.input.events.on('pointerlockchange', this._onPointerLockChange);
    s.events.once('shutdown', () => s.sys.game.input.events.off('pointerlockchange', this._onPointerLockChange));

    s.input.on('pointerdown', (p) => {
      if (this.sm.is('AIMING')) {
        if (p.rightButtonDown && p.rightButtonDown()) { this.lower(); return; }
        this._shoot();
      }
    });
    s.input.mouse && s.input.mouse.disableContextMenu();

    this.keySpace = s.input.keyboard.addKey('SPACE');
    this.keyEsc = s.input.keyboard.addKey('ESC');
    this.keyW = s.input.keyboard.addKey('W');
    this.keyS = s.input.keyboard.addKey('S');
    this.keySpace.on('down', () => this.toggle());
    this.keyEsc.on('down', () => { if (this.sm.is('AIMING')) this.lower(); });
    this.keyW.on('down', () => { if (this.sm.is('AIMING')) this._stepZoom(1); });
    this.keyS.on('down', () => { if (this.sm.is('AIMING')) this._stepZoom(-1); });

    s.events.on('update', this._update, this);
    s.events.once('shutdown', () => s.events.off('update', this._update, this));
  }

  _update() {
    if (!this.sm.is('AIMING') || this.transitioning) return; // let raise/lower tween finish first
    // OVERLAPPING ACTION: aim lags the pointer slightly (lerp), giving weight.
    this.aim.x = Phaser.Math.Linear(this.aim.x, this.aimTarget.x, 0.2);
    this.aim.y = Phaser.Math.Linear(this.aim.y, this.aimTarget.y, 0.2);
    this._applyWorldTransform(this.zAnim);
    this._drawDebugGizmo();
  }

  // Position+scale the world layer so `aim` sits at screen center at scale z.
  _applyWorldTransform(z) {
    this.world.setScale(z);
    this.world.x = this.screenC.x - this.aim.x * z;
    this.world.y = this.screenC.y - this.aim.y * z;
  }

  get frameBounds() {
    const efw = this.fw / this.zoomMult, efh = this.fh / this.zoomMult;
    return { x: this.aim.x - efw / 2, y: this.aim.y - efh / 2, w: efw, h: efh };
  }

  // ---- raise / lower --------------------------------------------------------
  toggle() {
    if (this.dialogOpen) return; // space advances dialog instead while it's open
    if (this.sm.is('IDLE')) this.raise();
    else if (this.sm.is('AIMING')) this.lower();
  }

  raise() {
    if (!this.sm.is('IDLE') || this.dialogOpen) return;
    this.sm.transition('AIMING');
    // Zoom always resets to 1x on raise.
    if (this._zoomTween) { this._zoomTween.stop(); this._zoomTween = null; }
    this.zoomMult = 1;
    this.zAnim = this.Z; // matches effZ at mult=1; raise's own tween below animates it in
    this._recomputeAimRange();
    this._highlightZoomIndicator();
    this.aimTarget.x = Phaser.Math.Clamp(this.aimTarget.x, this.aimRange.minX, this.aimRange.maxX);
    this.aimTarget.y = Phaser.Math.Clamp(this.aimTarget.y, this.aimRange.minY, this.aimRange.maxY);
    this.aim = { ...this.aimTarget };
    this.transitioning = true; // freeze _update until the zoom-in settles
    this.scene.input.setDefaultCursor('none');
    if (this.scene.input.mouse) this.scene.input.mouse.requestPointerLock();
    this.bus.emit(EVENTS.CAMERA_RAISED);
    // ARC + FOLLOW-THROUGH: zoom in to center on aim with a Back overshoot.
    this.scene.tweens.add({
      targets: this.world,
      scaleX: this.effZ, scaleY: this.effZ,
      x: this.screenC.x - this.aim.x * this.effZ,
      y: this.screenC.y - this.aim.y * this.effZ,
      ease: EASE.backOut, duration: DUR.base,
      onComplete: () => { this.transitioning = false; },
    });
    // STAGING: letterbox + frame fade in.
    this.scene.tweens.add({ targets: this._overlayAlphaProxy(), v: 1, ease: EASE.out, duration: DUR.base,
      onUpdate: (tw, t) => this._setOverlayAlpha(t.v) });
  }

  lower() {
    if (!this.sm.is('AIMING')) return;
    this.sm.transition('IDLE');
    if (this._zoomTween) { this._zoomTween.stop(); this._zoomTween = null; }
    this.transitioning = true;
    this.scene.input.setDefaultCursor('default');
    if (this.scene.input.mouse) this.scene.input.mouse.releasePointerLock();
    if (this.gizmo) this.gizmo.clear();
    this.bus.emit(EVENTS.CAMERA_LOWERED);
    // Zoom back out to identity (world fills the screen 1:1).
    this.scene.tweens.add({
      targets: this.world,
      scaleX: 1, scaleY: 1, x: 0, y: 0,
      ease: EASE.inOut, duration: DUR.base,
      onComplete: () => { this.transitioning = false; },
    });
    this.scene.tweens.add({ targets: this._overlayAlphaProxy(), v: 0, ease: EASE.in, duration: DUR.quick,
      onUpdate: (tw, t) => this._setOverlayAlpha(t.v) });
  }

  _overlayAlphaProxy() { return (this._alphaProxy ||= { v: 0 }); }

  // ---- shooting -------------------------------------------------------------
  _shoot() {
    // Mid raise/lower tween: world zoom, overlay fade, and the sidebar's own
    // slide-shut are all still animating, so the sidebar (and a half-faded
    // overlay) can still be on screen. Block the shot until it settles.
    if (this.transitioning) return;
    // Roll capacity: block when full (cozy — gentle cue, no penalty). Delete to free a slot.
    if (this.rollCount >= CONFIG.MAX_PHOTOS) { this._rollFullCue(); return; }
    this.rollCount++; // reserve the slot now so rapid clicks can't overshoot the cap

    const fb = this.frameBounds;
    this.bus.emit(EVENTS.SHUTTER_CLICK);
    // Snapshot the CLEAN strip first, then flash + announce in the callback so the
    // photo doesn't capture the white flash, the zoom indicator, or the
    // viewfinder chrome (grid/corners/dot/hint).
    this._setZoomIndicatorsVisible(false);
    this._setViewfinderChromeVisible(false);
    const id = `photo_${++this._photoCount}_${Date.now()}`;
    this._snapshotStrip(id, (ok) => {
      this._setZoomIndicatorsVisible(true);
      this._setViewfinderChromeVisible(true);
      // EXAGGERATION: flash slightly larger than the frame strip.
      playFlash(this.scene, { x: this.barW, y: 0, w: this.stripW, h: WORLD.height });
      // SECONDARY ACTION: frame border pulses once.
      this.scene.tweens.add({ targets: this.frame, scaleX: 1.01, scaleY: 1.01, ease: EASE.out, duration: DUR.micro, yoyo: true });
      this.bus.emit(EVENTS.PHOTO_TAKEN, { id, frameBounds: fb, thumbKey: ok ? id : null });
    });
  }

  // Cozy "roll full" cue: soft reticle pulse + a temporary hint. No shake, no penalty.
  _rollFullCue() {
    try { playMiss(this.scene, this.dot); } catch { /* optional */ }
    if (!this.hint) return;
    this.hint.setText(t('camera.rollfull')).setColor('#ffcaca');
    this.scene.time.delayedCall(1400, () => {
      if (this.hint) this.hint.setText(this._hintDefault).setColor('#ffffff');
    });
  }

  _snapshotStrip(key, cb) {
    const r = this.scene.game.renderer;
    if (!r || !r.snapshotArea) { cb(false); return; }
    const pad = 5; // inset to drop the frame border stroke from the saved photo
    r.snapshotArea(this.barW + pad, pad, this.stripW - pad * 2, WORLD.height - pad * 2, (img) => {
      try {
        if (this.scene.textures.exists(key)) this.scene.textures.remove(key);
        this.scene.textures.addImage(key, img);
        cb(true);
      } catch { cb(false); }
    });
  }

  // ---- bus / states ---------------------------------------------------------
  _wireBus() {
    const onRaiseReq = () => this.raise();
    // A narrative beat: when the special dialog opens, lower the camera for it and
    // lock raising until it closes.
    const onDialogShow = () => { this.dialogOpen = true; if (this.sm.is('AIMING')) this.lower(); };
    const onDialogClosed = () => { this.dialogOpen = false; };
    const onPhotoDeleted = () => { this.rollCount = Math.max(0, this.rollCount - 1); };
    this.bus.on(EVENTS.RAISE_REQUESTED, onRaiseReq);
    this.bus.on(EVENTS.DIALOG_SHOW, onDialogShow);
    this.bus.on(EVENTS.DIALOG_CLOSED, onDialogClosed);
    this.bus.on(EVENTS.PHOTO_DELETED, onPhotoDeleted);
    this.scene.events.once('shutdown', () => {
      this.bus.off(EVENTS.RAISE_REQUESTED, onRaiseReq);
      this.bus.off(EVENTS.DIALOG_SHOW, onDialogShow);
      this.bus.off(EVENTS.DIALOG_CLOSED, onDialogClosed);
      this.bus.off(EVENTS.PHOTO_DELETED, onPhotoDeleted);
    });
  }

  _wireStates() {
    this.sm.onEnter('IDLE', () => { /* HUD shown via CAMERA_LOWERED */ });
    this.sm.onEnter('AIMING', () => { /* HUD hidden via CAMERA_RAISED */ });
  }

  // Called by index after the intro completes.
  enterIdle() {
    this.sm.transition('IDLE');
    this._applyWorldTransform(1);
    this.bus.emit(EVENTS.CAMERA_LOWERED);
  }
}

export default CameraTool;
