// MainMenuScene — cozy title + a single Play button that opens the level select.
import Phaser from 'phaser';
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

    const play = makeButton(this, {
      x: W / 2, y: H * 0.58, w: 240, h: 66, label: 'Play', color: 0x7bbf6a, fontSize: 26,
      onClick: () => fadeScene(this, 'out', { onComplete: () => this.scene.start('LevelSelectScene') }),
    });
    popIn(play, { delay: 120 });
  }
}
export default MainMenuScene;
