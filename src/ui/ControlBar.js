// ControlBar — Confirm button. Visible only in IDLE (camera lowered).
// Hidden on CAMERA_RAISED so the player can focus on the camera vibes.
// Confirm can be pressed at any time in IDLE — that finalizes the level (the risk).
// Raising the camera is done with the SPACE key (see CameraTool), not a button.
import { EVENTS } from '../config/events.js';
import { popIn, popOut } from '../anim/motion.js';
import { makeButton } from './Button.js';
import { ConfirmDialog } from './ConfirmDialog.js';
import { FONTS } from '../config/fonts.js';
import { t } from '../core/i18n.js';

export class ControlBar {
  constructor(scene, bus, levelData, depth = 1000) {
    this.scene = scene;
    this.bus = bus;
    const W = scene.cameras.main.width, H = scene.cameras.main.height;

    // Mission completion mirror — total from level data, captured tracked live via
    // the same events MissionListUI listens to. Drives the "objectives left" warning.
    this._missionTotal = levelData.objects.filter((o) => o.mission).length;
    this._captured = new Set();
    this.warnDialog = new ConfirmDialog(scene);

    this.confirmBtn = this._button(W / 2, H - 64, t('btn.confirm'), 0x7bbf6a,
      () => this._onConfirm());

    this.tip = scene.add.text(W / 2, H - 110, t('hud.controltip'), {
      fontFamily: FONTS.body, fontSize: '15px', color: '#e8e2d6',
    }).setOrigin(0.5).setDepth(depth);

    this.group = [this.confirmBtn, this.tip];
    this.group.forEach((g) => g.setVisible(false).setScale(0)); // shown on first CAMERA_LOWERED

    this._onRaised = () => this.hide();
    this._onLowered = () => this.show();
    this._onCaptured = ({ objectId }) => this._captured.add(objectId);
    this._onSync = ({ capturedIds }) => { this._captured = new Set(capturedIds || []); };
    bus.on(EVENTS.CAMERA_RAISED, this._onRaised);
    bus.on(EVENTS.CAMERA_LOWERED, this._onLowered);
    bus.on(EVENTS.MISSION_CAPTURED, this._onCaptured);
    bus.on(EVENTS.MISSIONS_SYNC, this._onSync);
    scene.events.once('shutdown', () => {
      bus.off(EVENTS.CAMERA_RAISED, this._onRaised);
      bus.off(EVENTS.CAMERA_LOWERED, this._onLowered);
      bus.off(EVENTS.MISSION_CAPTURED, this._onCaptured);
      bus.off(EVENTS.MISSIONS_SYNC, this._onSync);
    });
  }

  // Confirm pressed. If missions remain, warn first and only finalize on the
  // player's explicit "finish anyway". All missions done -> finalize straight away.
  _onConfirm() {
    const remaining = this._missionTotal - this._captured.size;
    if (remaining > 0) {
      this.warnDialog.open({
        message: t('confirm.incomplete', { n: remaining }),
        confirmLabel: t('btn.finishanyway'),
        cancelLabel: t('btn.keepshooting'),
        onConfirm: () => this.bus.emit(EVENTS.SUBMIT_REQUESTED),
      });
      return;
    }
    this.bus.emit(EVENTS.SUBMIT_REQUESTED);
  }

  show() {
    this.group.forEach((g, i) => { g.setVisible(true); popIn(g, { delay: i * 50, keepAlpha: false }); });
  }

  hide() {
    this.group.forEach((g) => popOut(g, { onComplete: () => g.setVisible(false) }));
  }

  _button(x, y, label, color, onClick, w = 240, h = 56) {
    return makeButton(this.scene, { x, y, w, h, label, color, fontSize: 20, onClick, depth: 1000 });
  }
}

export default ControlBar;
