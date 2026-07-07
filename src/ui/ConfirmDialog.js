// ConfirmDialog — small reusable yes/no modal. Dim overlay swallows input; a panel
// with Delete / Cancel buttons. open({ message, onConfirm }); Delete runs the callback.
// Not bus-driven — the caller owns it and passes a callback.
import Phaser from 'phaser';
import { popIn, popOut, pressDip, EASE, DUR } from '../anim/motion.js';

export class ConfirmDialog {
  constructor(scene, depth = 1600) {
    this.scene = scene;
    this.isOpen = false;
    this._onConfirm = null;
    const W = scene.cameras.main.width, H = scene.cameras.main.height;

    this.dim = scene.add.rectangle(0, 0, W, H, 0x000000, 0).setOrigin(0, 0).setDepth(depth)
      .setVisible(false).setInteractive();
    this.dim.on('pointerdown', () => this.close()); // click outside = cancel

    const pw = 420, ph = 168;
    this.panel = scene.add.container(W / 2, H / 2).setDepth(depth + 1).setVisible(false);
    const bg = scene.add.rectangle(0, 0, pw, ph, 0x2b2230, 0.98).setOrigin(0.5).setStrokeStyle(3, 0xffe08a, 0.8);
    this.msg = scene.add.text(0, -44, 'Delete this photo?', {
      fontFamily: 'system-ui, sans-serif', fontSize: '20px', color: '#fff5e6', fontStyle: 'bold',
    }).setOrigin(0.5);
    const del = this._button(-92, 36, 'Delete', 0xc06060, () => this._confirm());
    const cancel = this._button(92, 36, 'Cancel', 0x4a5a7a, () => this.close());
    this.panel.add([bg, this.msg, del, cancel]);
  }

  open({ message, onConfirm } = {}) {
    if (message) this.msg.setText(message);
    this._onConfirm = onConfirm || null;
    this.isOpen = true;
    this.dim.setVisible(true);
    this.scene.tweens.add({ targets: this.dim, fillAlpha: 0.5, ease: EASE.out, duration: DUR.base });
    this.panel.setVisible(true);
    popIn(this.panel);
  }

  _confirm() {
    const cb = this._onConfirm;
    this.close();
    if (cb) cb();
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this._onConfirm = null;
    this.scene.tweens.add({ targets: this.dim, fillAlpha: 0, ease: EASE.in, duration: DUR.base,
      onComplete: () => this.dim.setVisible(false) });
    popOut(this.panel, { onComplete: () => { this.panel.setVisible(true).setScale(1); this.panel.setVisible(false); } });
  }

  _button(x, y, label, color, onClick, w = 150, h = 48) {
    const s = this.scene;
    const c = s.add.container(x, y);
    const bg = s.add.rectangle(0, 0, w, h, color, 1).setOrigin(0.5).setStrokeStyle(2, 0xffffff, 0.5);
    const txt = s.add.text(0, 0, label, {
      fontFamily: 'system-ui, sans-serif', fontSize: '18px', color: '#ffffff',
    }).setOrigin(0.5);
    c.add([bg, txt]);
    c.setSize(w, h).setInteractive(new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h), Phaser.Geom.Rectangle.Contains);
    c.on('pointerover', () => s.tweens.add({ targets: c, scaleX: 1.06, scaleY: 1.06, ease: EASE.out, duration: DUR.press }));
    c.on('pointerout', () => s.tweens.add({ targets: c, scaleX: 1, scaleY: 1, ease: EASE.out, duration: DUR.press }));
    c.on('pointerdown', (p, lx, ly, e) => { e && e.stopPropagation && e.stopPropagation(); pressDip(c, { onComplete: onClick }); });
    return c;
  }
}

export default ConfirmDialog;
