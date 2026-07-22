// LevelSelectScene — the level hub. Shows the city cards (Padang / Bandung /
// Yogyakarta) with saved star progress. Reached from the main menu's Play button and
// from the Result screen. Picking a city continues into its cutscene.
import Phaser from 'phaser';
import { LEVELS } from './levels.js';
import { loadProgress } from '../core/progress.js';
import { hasPhotos } from '../core/gallery.js';
import { popIn, fadeScene } from '../anim/motion.js';
import { makeButton } from '../ui/Button.js';
import { LevelInfoDialog } from '../ui/LevelInfoDialog.js';
import { FONTS } from '../config/fonts.js';
import { t, L } from '../core/i18n.js';

export class LevelSelectScene extends Phaser.Scene {
  constructor() { super('LevelSelectScene'); }

  create() {
    const { width: W, height: H } = this.cameras.main;
    this.cameras.main.setBackgroundColor('#20242f');
    fadeScene(this, 'in');

    const head = this.add.text(W / 2, H * 0.22, t('levelselect.title'), {
      fontFamily: FONTS.display, fontSize: '40px', color: '#fff5e6', fontStyle: 'bold',
    }).setOrigin(0.5);
    popIn(head);

    // Locked-level hint — created once, hidden; flashed by _denied() on a locked tap.
    this._hint = this.add.text(W / 2, H * 0.22 + 44, t('levelselect.lockedhint'), {
      fontFamily: FONTS.body, fontSize: '18px', color: '#ff9a6b',
    }).setOrigin(0.5).setAlpha(0);

    this._info = new LevelInfoDialog(this); // level intro popup (Main / Gallery)

    const progress = loadProgress();
    LEVELS.forEach((lv, i) => {
      const bx = W / 2 + (i - 1) * 220;
      // Sequential unlock: level 0 is always open; later levels need the previous one finished.
      const unlocked = i === 0 || Boolean(progress[i - 1]);
      const card = makeButton(this, {
        x: bx, y: H * 0.5, w: 190, h: 64,
        label: unlocked ? lv.name : `🔒 ${lv.name}`,
        color: unlocked ? 0x4a5a7a : 0x3a3f4a, fontSize: 20,
        onClick: () => (unlocked ? this._openInfo(i) : this._denied(card)),
      });
      if (!unlocked) card.setAlpha(0.55);
      popIn(card, { delay: 150 + i * 80 });

      // Saved best: filled/empty stars, "locked", or a gentle "not played yet".
      const entry = progress[i];
      let label, color;
      if (!unlocked) { label = t('levelselect.locked'); color = '#6b6459'; }
      else if (entry) { label = '★★★☆☆☆'.slice(3 - entry.stars, 6 - entry.stars); color = '#ffd24a'; }
      else { label = t('levelselect.notplayed'); color = '#6b6459'; }
      this.add.text(bx, H * 0.5 + 52, label, {
        fontFamily: FONTS.body, fontSize: '18px', color,
      }).setOrigin(0.5);
    });

    const back = makeButton(this, {
      x: W / 2, y: H - 70, w: 160, h: 50, label: t('btn.back'), color: 0x3a4353, fontSize: 18,
      onClick: () => fadeScene(this, 'out', { onComplete: () => this.scene.start('MainMenuScene') }),
    });
    popIn(back, { delay: 420 });
  }

  // _openInfo — level intro popup: description + Main (play) and, when the level
  // already has saved photos, a Gallery button.
  _openInfo(index) {
    const lv = LEVELS[index];
    this._info.open({
      name: lv.name,
      description: L((lv.cutscene && lv.cutscene[0]) || ''),
      hasGallery: hasPhotos(lv.id),
      onPlay: () => this._play(index),
      onGallery: () => fadeScene(this, 'out', {
        onComplete: () => this.scene.start('GalleryScene', { levelIndex: index }),
      }),
    });
  }

  _play(index) {
    fadeScene(this, 'out', { onComplete: () => this.scene.start('CutsceneScene', { levelIndex: index }) });
  }

  // _denied — feedback for tapping a locked card: shake the card + flash the hint.
  _denied(card) {
    const homeX = card.x;
    this.tweens.killTweensOf(card);
    this.tweens.add({
      targets: card, x: homeX + 8, duration: 50, ease: 'Sine.inOut',
      yoyo: true, repeat: 3, onComplete: () => { card.x = homeX; },
    });
    this.tweens.killTweensOf(this._hint);
    this._hint.setAlpha(0);
    this.tweens.add({
      targets: this._hint, alpha: 1, duration: 120, ease: 'Sine.out',
      hold: 1200, yoyo: true,
    });
  }
}
export default LevelSelectScene;
