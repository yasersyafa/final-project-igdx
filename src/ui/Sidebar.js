// Sidebar — a single drawer (right or left edge, per settings) housing the shot
// list (missions) and the photo roll behind two tabs. An edge handle toggles it
// open/closed and rides along the panel's inner edge (so it sits just inside the
// open panel, not stuck at the screen edge); the whole drawer hides on
// CAMERA_RAISED (aiming) and restores its last open/closed state on
// CAMERA_LOWERED, matching the existing HUD convention (MissionListUI/ControlBar)
// of hiding while aiming. Rendered above the rest of the HUD (ControlBar's
// tip/confirm) so nothing else draws over it.
import { EVENTS } from '../config/events.js';
import { EASE, DUR, popIn, popOut } from '../anim/motion.js';
import { makeButton } from './Button.js';
import { MissionListUI } from './MissionListUI.js';
import { PhotoStrip } from './PhotoStrip.js';
import { FONTS } from '../config/fonts.js';
import { t } from '../core/i18n.js';
import { getSidebarSide } from '../core/settings.js';

const PANEL_W = 300;
const HANDLE_W = 32;
const TAB_ACTIVE = 0x6a5a8a, TAB_INACTIVE = 0x3a3345;

export class Sidebar {
  constructor(scene, bus, levelData, depth = 1000) {
    this.scene = scene;
    this.bus = bus;
    this.depth = depth;
    this.tab = 'shots';    // 'shots' | 'roll'
    this.open = false;     // user's drawer toggle, persists across camera raise/lower
    this.camVisible = false;
    this.side = getSidebarSide(); // 'left' | 'right', read once (Settings is Main-Menu-only)

    const W = scene.cameras.main.width, H = scene.cameras.main.height;
    if (this.side === 'left') {
      this.openX = 0;
      this.closedX = -PANEL_W;
    } else {
      this.openX = W - PANEL_W;
      this.closedX = W;
    }

    // ---- sliding panel body -------------------------------------------------
    this.panel = scene.add.container(this.closedX, 0).setDepth(depth);
    const bg = scene.add.rectangle(0, 0, PANEL_W, H, 0x2b2230, 0.94)
      .setOrigin(0, 0).setStrokeStyle(2, 0xffe08a, 0.5);
    this.panel.add(bg);

    this.tabShots = this._tabButton(75, 26, t('hud.shotlist'), () => this.showTab('shots'));
    this.tabRoll = this._tabButton(PANEL_W - 75, 26, t('hud.rolltab'), () => this.showTab('roll'));
    this.panel.add([this.tabShots, this.tabRoll]);

    this.shotsGroup = scene.add.container(0, 0);
    this.missions = new MissionListUI(scene, bus, levelData, depth, {
      // wrapWidth accounts for the row's own 26px checkbox gap + a right margin,
      // on top of the row's x start, so wrapped text stays inside the panel.
      layer: this.shotsGroup, x: 20, y: 60, wrapWidth: PANEL_W - 20 - 26 - 20,
    });
    this.panel.add(this.shotsGroup);

    this.rollGroup = scene.add.container(0, 0);
    this.strip = new PhotoStrip(scene, bus, levelData, depth, {
      layer: this.rollGroup, originX: PANEL_W / 2, top: 146, step: 92, headerGap: 74, cols: 2, colGap: 10,
      flyStart: () => ({ x: W / 2 - this.panel.x, y: H / 2 }),
    });
    this.panel.add(this.rollGroup);

    this.rollGroup.setVisible(false);
    this._setTabHighlight();

    // ---- handle: rides the panel's inner edge (the one facing screen center),
    // so it's just inside the panel when open and peeking at the screen edge
    // when closed. -----
    this.handle = makeButton(scene, {
      x: this._handleX(this.closedX), y: H / 2, w: HANDLE_W, h: 64, label: '', color: 0x4a5a7a, fontSize: 20,
      depth, onClick: () => this.toggle(),
    });
    this._updateHandleArrow();
    this.handle.setVisible(false).setScale(0);

    this._onRaised = () => this._setCameraVisible(false);
    this._onLowered = () => this._setCameraVisible(true);
    this._onPhoto = () => { if (this.tab !== 'roll') this.showTab('roll'); };
    bus.on(EVENTS.CAMERA_RAISED, this._onRaised);
    bus.on(EVENTS.CAMERA_LOWERED, this._onLowered);
    bus.on(EVENTS.PHOTO_TAKEN, this._onPhoto);
    scene.events.once('shutdown', () => {
      bus.off(EVENTS.CAMERA_RAISED, this._onRaised);
      bus.off(EVENTS.CAMERA_LOWERED, this._onLowered);
      bus.off(EVENTS.PHOTO_TAKEN, this._onPhoto);
    });
  }

  // Switch tab content. Auto-opens the drawer if it's closed (e.g. a fresh photo
  // pulls the roll tab into view so the player notices it landed) — but only
  // visually while the camera is lowered; see _open()'s camVisible guard.
  showTab(tab) {
    if (this.tab === tab && this.open) return;
    this.tab = tab;
    this._setTabHighlight();
    const showShots = tab === 'shots';
    this.shotsGroup.setVisible(showShots);
    this.rollGroup.setVisible(!showShots);
    if (showShots) this.missions.show();
    if (!this.open) this._open();
  }

  toggle() {
    if (!this.camVisible) return; // handle is hidden/non-interactive while aiming anyway
    this.open ? this._close() : this._open();
  }

  _open() {
    this.open = true;
    this._updateHandleArrow();
    // Remember the intent (e.g. PHOTO_TAKEN's showTab('roll') mid-aim) but don't
    // reveal it until the camera is actually lowered — never slide open over the
    // viewfinder/snapshot strip while aiming.
    if (!this.camVisible) return;
    this._slidePanel(this.openX);
    if (this.tab === 'shots') this.missions.show();
  }

  _close() {
    this.open = false;
    this._updateHandleArrow();
    this._slidePanel(this.closedX);
  }

  // Whole drawer + handle hide while aiming (CAMERA_RAISED), matching the rest of
  // the HUD. The open/closed choice the player made is remembered and restored.
  _setCameraVisible(v) {
    this.camVisible = v;
    if (v) {
      this.handle.setVisible(true);
      popIn(this.handle);
      if (this.open) this._slidePanel(this.openX);
    } else {
      popOut(this.handle, { onComplete: () => this.handle.setVisible(false) });
      // Snap shut instantly (no tween) every time camera mode is entered, whatever
      // state it was in — guarantees the drawer can never be mid-slide, or forced
      // back open by a stray showTab() call, while a snapshot is taken.
      this._snapClosed();
    }
  }

  _snapClosed() {
    if (this._panelTween) { this._panelTween.stop(); this._panelTween = null; }
    if (this._handleTween) { this._handleTween.stop(); this._handleTween = null; }
    this.panel.x = this.closedX;
    this.handle.x = this._handleX(this.closedX);
  }

  // Tweens the panel and rides the handle along its inner edge, in lockstep —
  // same ease/duration on both keeps the handle's offset from the panel constant
  // at every frame, so it visually stays glued to the panel while it slides.
  _slidePanel(targetX) {
    if (this._panelTween) this._panelTween.stop();
    if (this._handleTween) this._handleTween.stop();
    this._panelTween = this.scene.tweens.add({ targets: this.panel, x: targetX, ease: EASE.cubicOut, duration: DUR.base });
    this._handleTween = this.scene.tweens.add({ targets: this.handle, x: this._handleX(targetX), ease: EASE.cubicOut, duration: DUR.base });
  }

  _handleX(panelX) {
    return this.side === 'left'
      ? panelX + PANEL_W + HANDLE_W / 2
      : panelX - HANDLE_W / 2;
  }

  // Arrows mirror by side so they still read as "points toward where the
  // panel will appear from" (closed) / "points back to collapse" (open).
  _updateHandleArrow() {
    const closedArrow = this.side === 'left' ? '◂' : '▸';
    const openArrow = this.side === 'left' ? '▸' : '◂';
    this.handle.label.setText(this.open ? openArrow : closedArrow);
  }

  _setTabHighlight() {
    this.tabShots.list[0].setFillStyle(this.tab === 'shots' ? TAB_ACTIVE : TAB_INACTIVE, 1);
    this.tabRoll.list[0].setFillStyle(this.tab === 'roll' ? TAB_ACTIVE : TAB_INACTIVE, 1);
  }

  _tabButton(x, y, label, onClick) {
    const b = makeButton(this.scene, { x, y, w: 130, h: 36, label, color: TAB_INACTIVE, fontSize: 15, onClick, depth: this.depth });
    return b;
  }
}

export default Sidebar;
