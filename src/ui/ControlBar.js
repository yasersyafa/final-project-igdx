// ControlBar — Raise Camera + Confirm buttons. Visible only in IDLE (camera lowered).
// Hidden on CAMERA_RAISED so the player can focus on the camera vibes.
// Confirm can be pressed at any time in IDLE — that finalizes the level (the risk).
import Phaser from 'phaser';
import { EVENTS } from '../config/events.js';
import { EASE, DUR, popIn, popOut, pressDip } from '../anim/motion.js';

export class ControlBar {
  constructor(scene, bus, levelData, depth = 1000) {
    this.scene = scene;
    this.bus = bus;
    const W = scene.cameras.main.width, H = scene.cameras.main.height;

    this.raiseBtn = this._button(W / 2 - 150, H - 64, '📷  Raise Camera', 0x4a6a8a,
      () => bus.emit(EVENTS.RAISE_REQUESTED));
    this.confirmBtn = this._button(W / 2 + 150, H - 64, '✓  Confirm', 0x7bbf6a,
      () => bus.emit(EVENTS.SUBMIT_REQUESTED));

    this.tip = scene.add.text(W / 2, H - 110, 'Raise the camera to shoot · Confirm when you are happy with your roll', {
      fontFamily: 'system-ui, sans-serif', fontSize: '15px', color: '#e8e2d6',
    }).setOrigin(0.5).setDepth(depth);

    this.group = [this.raiseBtn, this.confirmBtn, this.tip];
    this.group.forEach((g) => g.setVisible(false).setScale(0)); // shown on first CAMERA_LOWERED

    this._onRaised = () => this.hide();
    this._onLowered = () => this.show();
    bus.on(EVENTS.CAMERA_RAISED, this._onRaised);
    bus.on(EVENTS.CAMERA_LOWERED, this._onLowered);
    scene.events.once('shutdown', () => {
      bus.off(EVENTS.CAMERA_RAISED, this._onRaised);
      bus.off(EVENTS.CAMERA_LOWERED, this._onLowered);
    });
  }

  show() {
    this.group.forEach((g, i) => { g.setVisible(true); popIn(g, { delay: i * 50, keepAlpha: false }); });
  }

  hide() {
    this.group.forEach((g) => popOut(g, { onComplete: () => g.setVisible(false) }));
  }

  _button(x, y, label, color, onClick, w = 240, h = 56) {
    const s = this.scene;
    const c = s.add.container(x, y).setDepth(1000);
    const bg = s.add.rectangle(0, 0, w, h, color, 1).setOrigin(0.5).setStrokeStyle(2, 0xffffff, 0.5);
    const txt = s.add.text(0, 0, label, {
      fontFamily: 'system-ui, sans-serif', fontSize: '20px', color: '#ffffff',
    }).setOrigin(0.5);
    c.add([bg, txt]);
    c.setSize(w, h).setInteractive(new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h), Phaser.Geom.Rectangle.Contains);
    c.on('pointerover', () => s.tweens.add({ targets: c, scaleX: 1.06, scaleY: 1.06, ease: EASE.out, duration: DUR.press }));
    c.on('pointerout', () => s.tweens.add({ targets: c, scaleX: 1, scaleY: 1, ease: EASE.out, duration: DUR.press }));
    c.on('pointerdown', () => pressDip(c, { onComplete: onClick }));
    return c;
  }
}

export default ControlBar;
