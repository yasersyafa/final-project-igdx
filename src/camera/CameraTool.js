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
import { EASE, DUR } from '../anim/motion.js';
import { playFlash, playClick, playMiss } from './CaptureFeedback.js';

const STATES = ['INTRO', 'IDLE', 'AIMING'];

export class CameraTool {
  constructor(scene, bus) {
    this.scene = scene;
    this.bus = bus;
    this.world = scene.world; // zoomable container holding bg + PhotoObjects
    this.fw = CONFIG.FRAME_SIZE.width;
    this.fh = CONFIG.FRAME_SIZE.height;

    // Zoom factor: frame height fills the screen height -> vision limited to frame.
    this.Z = WORLD.height / this.fh;            // 720/270 = 2.667
    this.stripW = this.fw * this.Z;             // 360*2.667 = 960
    this.barW = (WORLD.width - this.stripW) / 2; // 160 each side
    this.screenC = { x: WORLD.width / 2, y: WORLD.height / 2 };

    // aim point (world coords), clamped so the frame stays inside the world.
    this.aim = { x: WORLD.width / 2, y: WORLD.height / 2 };
    this.aimTarget = { ...this.aim };
    this.aimRange = {
      minX: this.fw / 2, maxX: WORLD.width - this.fw / 2,
      minY: this.fh / 2, maxY: WORLD.height - this.fh / 2,
    };

    this.sm = createStateMachine('INTRO', STATES);
    this._photoCount = 0;
    this.rollCount = 0; // photos currently in the roll (capped at CONFIG.MAX_PHOTOS)
    this._hintDefault = 'aim — click to shoot · space/right-click to lower';

    this._buildOverlay();
    this._wireInput();
    this._wireBus();
    this._wireStates();
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
    // Center focus dot.
    this.dot = s.add.circle(W / 2, H / 2, 3, 0xffffff, 0.7).setDepth(801);
    // "REC"-ish hint.
    this.hint = s.add.text(16, 14, 'aim — click to shoot · space/right-click to lower', {
      fontFamily: 'system-ui, sans-serif', fontSize: '14px', color: '#ffffff',
    }).setDepth(801).setAlpha(0.8);

    this.overlay = [this.barL, this.barR, this.frame, this.corners, this.dot, this.hint];
    this._setOverlayAlpha(0); // hidden until AIMING
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

  _setOverlayAlpha(a) { this.overlay.forEach((o) => o.setAlpha(o === this.hint ? a * 0.8 : a)); }

  // ---- input ----------------------------------------------------------------
  _wireInput() {
    const s = this.scene;

    s.input.on('pointermove', (p) => {
      if (!this.sm.is('AIMING')) return;
      const fx = Phaser.Math.Clamp(p.x / WORLD.width, 0, 1);
      const fy = Phaser.Math.Clamp(p.y / WORLD.height, 0, 1);
      this.aimTarget.x = this.aimRange.minX + fx * (this.aimRange.maxX - this.aimRange.minX);
      this.aimTarget.y = this.aimRange.minY + fy * (this.aimRange.maxY - this.aimRange.minY);
    });

    s.input.on('pointerdown', (p) => {
      if (this.sm.is('AIMING')) {
        if (p.rightButtonDown && p.rightButtonDown()) { this.lower(); return; }
        this._shoot();
      }
    });
    s.input.mouse && s.input.mouse.disableContextMenu();

    this.keySpace = s.input.keyboard.addKey('SPACE');
    this.keyEsc = s.input.keyboard.addKey('ESC');
    this.keySpace.on('down', () => this.toggle());
    this.keyEsc.on('down', () => { if (this.sm.is('AIMING')) this.lower(); });

    s.events.on('update', this._update, this);
    s.events.once('shutdown', () => s.events.off('update', this._update, this));
  }

  _update() {
    if (!this.sm.is('AIMING') || this.transitioning) return; // let raise/lower tween finish first
    // OVERLAPPING ACTION: aim lags the pointer slightly (lerp), giving weight.
    this.aim.x = Phaser.Math.Linear(this.aim.x, this.aimTarget.x, 0.2);
    this.aim.y = Phaser.Math.Linear(this.aim.y, this.aimTarget.y, 0.2);
    this._applyWorldTransform(this.Z);
  }

  // Position+scale the world layer so `aim` sits at screen center at scale z.
  _applyWorldTransform(z) {
    this.world.setScale(z);
    this.world.x = this.screenC.x - this.aim.x * z;
    this.world.y = this.screenC.y - this.aim.y * z;
  }

  get frameBounds() {
    return { x: this.aim.x - this.fw / 2, y: this.aim.y - this.fh / 2, w: this.fw, h: this.fh };
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
    this.aim = { ...this.aimTarget };
    this.transitioning = true; // freeze _update until the zoom-in settles
    this.scene.input.setDefaultCursor('none');
    this.bus.emit(EVENTS.CAMERA_RAISED);
    // ARC + FOLLOW-THROUGH: zoom in to center on aim with a Back overshoot.
    this.scene.tweens.add({
      targets: this.world,
      scaleX: this.Z, scaleY: this.Z,
      x: this.screenC.x - this.aim.x * this.Z,
      y: this.screenC.y - this.aim.y * this.Z,
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
    this.transitioning = true;
    this.scene.input.setDefaultCursor('default');
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
    // Roll capacity: block when full (cozy — gentle cue, no penalty). Delete to free a slot.
    if (this.rollCount >= CONFIG.MAX_PHOTOS) { this._rollFullCue(); return; }
    this.rollCount++; // reserve the slot now so rapid clicks can't overshoot the cap

    const fb = this.frameBounds;
    playClick(this.scene);
    // Snapshot the CLEAN strip first, then flash + announce in the callback so the
    // photo doesn't capture the white flash.
    const id = `photo_${++this._photoCount}_${Date.now()}`;
    this._snapshotStrip(id, (ok) => {
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
    this.hint.setText('Roll full — lower the camera to delete a photo').setColor('#ffcaca');
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
