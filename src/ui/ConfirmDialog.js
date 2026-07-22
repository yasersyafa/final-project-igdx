// ConfirmDialog — small reusable yes/no modal. Dim overlay swallows input; a panel
// with Delete / Cancel buttons. open({ message, onConfirm }); Delete runs the callback.
// Not bus-driven — the caller owns it and passes a callback.
import { popIn, popOut, EASE, DUR } from '../anim/motion.js';
import { makeButton } from './Button.js';
import { FONTS } from '../config/fonts.js';
import { t } from '../core/i18n.js';

export class ConfirmDialog {
  constructor(scene, depth = 1600) {
    this.scene = scene;
    this.isOpen = false;
    this._onConfirm = null;
    const W = scene.cameras.main.width, H = scene.cameras.main.height;

    this.dim = scene.add.rectangle(0, 0, W, H, 0x000000, 0).setOrigin(0, 0).setDepth(depth)
      .setVisible(false).setInteractive();
    this.dim.on('pointerdown', () => this.close()); // click outside = cancel

    const pw = 460, ph = 230;
    this.panel = scene.add.container(W / 2, H / 2).setDepth(depth + 1).setVisible(false);
    const bg = scene.add.rectangle(0, 0, pw, ph, 0x2b2230, 0.98).setOrigin(0.5).setStrokeStyle(3, 0xffe08a, 0.8);
    // Message sits in the upper half and wraps; buttons pinned to the lower edge.
    this.msg = scene.add.text(0, -52, t('confirm.deletephoto'), {
      fontFamily: FONTS.body, fontSize: '20px', color: '#fff5e6', fontStyle: 'bold',
      align: 'center', wordWrap: { width: pw - 56 }, lineSpacing: 4,
    }).setOrigin(0.5);
    this.confirmBtn = this._button(-96, 62, t('btn.delete'), 0xc06060, () => this._confirm());
    this.cancelBtn = this._button(96, 62, t('btn.cancel'), 0x4a5a7a, () => this.close());
    this.panel.add([bg, this.msg, this.confirmBtn, this.cancelBtn]);
  }

  // open({ message, onConfirm, confirmLabel, cancelLabel }) — labels default to the
  // Delete/Cancel pair; pass overrides for a non-delete confirm (e.g. a warning).
  open({ message, onConfirm, confirmLabel, cancelLabel } = {}) {
    if (message) this.msg.setText(message);
    this.confirmBtn.label.setText(confirmLabel || t('btn.delete'));
    this.cancelBtn.label.setText(cancelLabel || t('btn.cancel'));
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
    return makeButton(this.scene, { x, y, w, h, label, color, fontSize: 18, onClick, stopPropagation: true });
  }
}

export default ConfirmDialog;
