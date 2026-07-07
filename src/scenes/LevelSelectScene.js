// LevelSelectScene — the level hub. Shows the city cards (Padang / Bandung /
// Yogyakarta) with saved star progress. Reached from the main menu's Play button and
// from the Result screen. Picking a city continues into its cutscene.
import Phaser from 'phaser';
import { LEVELS } from './levels.js';
import { loadProgress } from '../core/progress.js';
import { popIn, fadeScene } from '../anim/motion.js';
import { makeButton } from '../ui/Button.js';

export class LevelSelectScene extends Phaser.Scene {
  constructor() { super('LevelSelectScene'); }

  create() {
    const { width: W, height: H } = this.cameras.main;
    this.cameras.main.setBackgroundColor('#20242f');
    fadeScene(this, 'in');

    const head = this.add.text(W / 2, H * 0.22, 'Choose a destination', {
      fontFamily: 'system-ui, sans-serif', fontSize: '40px', color: '#fff5e6', fontStyle: 'bold',
    }).setOrigin(0.5);
    popIn(head);

    const progress = loadProgress();
    LEVELS.forEach((lv, i) => {
      const bx = W / 2 + (i - 1) * 220;
      const card = makeButton(this, {
        x: bx, y: H * 0.5, w: 190, h: 64, label: lv.name, color: 0x4a5a7a, fontSize: 20,
        onClick: () => this._play(i),
      });
      popIn(card, { delay: 150 + i * 80 });

      // Saved best: filled/empty stars, or a gentle "not played yet".
      const entry = progress[i];
      const label = entry ? '★★★☆☆☆'.slice(3 - entry.stars, 6 - entry.stars) : '— not played';
      this.add.text(bx, H * 0.5 + 52, label, {
        fontFamily: 'system-ui, sans-serif', fontSize: '18px',
        color: entry ? '#ffd24a' : '#6b6459',
      }).setOrigin(0.5);
    });

    const back = makeButton(this, {
      x: W / 2, y: H - 70, w: 160, h: 50, label: '← Back', color: 0x3a4353, fontSize: 18,
      onClick: () => fadeScene(this, 'out', { onComplete: () => this.scene.start('MainMenuScene') }),
    });
    popIn(back, { delay: 420 });
  }

  _play(index) {
    fadeScene(this, 'out', { onComplete: () => this.scene.start('CutsceneScene', { levelIndex: index }) });
  }
}
export default LevelSelectScene;
