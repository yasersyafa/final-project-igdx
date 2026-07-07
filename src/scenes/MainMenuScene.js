// MainMenuScene — cozy title + Start, with a small level select.
import Phaser from 'phaser';
import { LEVELS } from './levels.js';
import { loadProgress } from '../core/progress.js';
import { popIn, fadeScene, DUR, idleBob } from '../anim/motion.js';
import { makeButton } from '../ui/Button.js';

export class MainMenuScene extends Phaser.Scene {
  constructor() { super('MainMenuScene'); }

  create() {
    const { width: W, height: H } = this.cameras.main;
    this.cameras.main.setBackgroundColor('#20242f');
    fadeScene(this, 'in');

    const title = this.add.text(W / 2, H * 0.28, 'Photo Walk', {
      fontFamily: 'system-ui, sans-serif', fontSize: '64px', color: '#fff5e6', fontStyle: 'bold',
    }).setOrigin(0.5);
    popIn(title);
    idleBob(title, { amount: 6, duration: DUR.idleBreathe });

    this.add.text(W / 2, H * 0.28 + 56, 'a cozy photography game', {
      fontFamily: 'system-ui, sans-serif', fontSize: '20px', color: '#c9c2b6',
    }).setOrigin(0.5);

    const start = this._button(W / 2, H * 0.52, 'Start', 0x7bbf6a, () => this._play(0));
    popIn(start, { delay: 120 });

    // level select
    this.add.text(W / 2, H * 0.66, 'or pick a level', {
      fontFamily: 'system-ui, sans-serif', fontSize: '16px', color: '#9b958a',
    }).setOrigin(0.5);
    const progress = loadProgress();
    LEVELS.forEach((lv, i) => {
      const bx = W / 2 + (i - 1) * 200;
      const b = this._button(bx, H * 0.76, lv.name, 0x4a5a7a, () => this._play(i), 180, 48, 15);
      popIn(b, { delay: 200 + i * 70 });

      // Saved best: filled/empty stars, or a gentle "not played yet".
      const entry = progress[i];
      const label = entry ? '★★★☆☆☆'.slice(3 - entry.stars, 6 - entry.stars) : '— not played';
      this.add.text(bx, H * 0.76 + 40, label, {
        fontFamily: 'system-ui, sans-serif', fontSize: '16px',
        color: entry ? '#ffd24a' : '#6b6459',
      }).setOrigin(0.5);
    });
  }

  _play(index) {
    fadeScene(this, 'out', { onComplete: () => this.scene.start('CutsceneScene', { levelIndex: index }) });
  }

  _button(x, y, label, color, onClick, w = 220, h = 60, fs = 24) {
    return makeButton(this, { x, y, w, h, label, color, fontSize: fs, onClick });
  }
}
export default MainMenuScene;
