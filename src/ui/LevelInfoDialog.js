// LevelInfoDialog — level intro modal shown when a level card is tapped. Dim
// overlay swallows input; a panel shows the level name + description, a Main
// (play) button, and a Gallery button (only when saved photos exist).
// Modeled on ui/ConfirmDialog.js — caller owns it and passes callbacks.
import { popIn, popOut, EASE, DUR } from '../anim/motion.js';
import { makeButton } from './Button.js';
import { FONTS } from '../config/fonts.js';
import { t } from '../core/i18n.js';

export class LevelInfoDialog {
  constructor(scene, depth = 1600) {
    this.scene = scene;
    this.isOpen = false;
    const W = scene.cameras.main.width, H = scene.cameras.main.height;

    this.dim = scene.add.rectangle(0, 0, W, H, 0x000000, 0).setOrigin(0, 0).setDepth(depth)
      .setVisible(false).setInteractive();
    this.dim.on('pointerdown', () => this.close()); // click outside = cancel

    const pw = 480, ph = 260;
    this.panel = scene.add.container(W / 2, H / 2).setDepth(depth + 1).setVisible(false);
    const bg = scene.add.rectangle(0, 0, pw, ph, 0x2b2230, 0.98).setOrigin(0.5).setStrokeStyle(3, 0xffe08a, 0.8);
    this.title = scene.add.text(0, -92, '', {
      fontFamily: FONTS.display, fontSize: '30px', color: '#fff5e6', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.desc = scene.add.text(0, -30, '', {
      fontFamily: FONTS.body, fontSize: '18px', color: '#c9c2b6',
      align: 'center', wordWrap: { width: pw - 60 },
    }).setOrigin(0.5);
    this.panel.add([bg, this.title, this.desc]);

    // Buttons are (re)placed on open depending on whether Gallery is shown.
    this.playBtn = null;
    this.galleryBtn = null;
    this._panelH = ph;
  }

  open({ name, description, hasGallery, onPlay, onGallery } = {}) {
    this.title.setText(name || '');
    this.desc.setText(description || '');

    if (this.playBtn) { this.playBtn.destroy(); this.playBtn = null; }
    if (this.galleryBtn) { this.galleryBtn.destroy(); this.galleryBtn = null; }

    const by = 78;
    const mk = (x, label, color, cb) => makeButton(this.scene, {
      x, y: by, w: 170, h: 52, label, color, fontSize: 20, depth: 2000,
      stopPropagation: true, onClick: () => { this.close(); if (cb) cb(); },
    });
    if (hasGallery) {
      this.playBtn = mk(-96, t('btn.main'), 0x7bbf6a, onPlay);
      this.galleryBtn = mk(96, t('btn.album'), 0x4a5a7a, onGallery);
      this.panel.add([this.playBtn, this.galleryBtn]);
    } else {
      this.playBtn = mk(0, t('btn.main'), 0x7bbf6a, onPlay);
      this.panel.add(this.playBtn);
    }

    this.isOpen = true;
    this.dim.setVisible(true);
    this.scene.tweens.add({ targets: this.dim, fillAlpha: 0.5, ease: EASE.out, duration: DUR.base });
    this.panel.setVisible(true);
    popIn(this.panel);
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.scene.tweens.add({ targets: this.dim, fillAlpha: 0, ease: EASE.in, duration: DUR.base,
      onComplete: () => this.dim.setVisible(false) });
    popOut(this.panel, { onComplete: () => { this.panel.setVisible(true).setScale(1); this.panel.setVisible(false); } });
  }
}

export default LevelInfoDialog;
