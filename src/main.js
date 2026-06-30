// Phaser game bootstrap. Scene flow: Boot -> Preload -> MainMenu -> Level -> Result.
import Phaser from 'phaser';
import { WORLD } from './config/gameConfig.js';
import { setReducedMotion } from './anim/motion.js';

import { BootScene } from './scenes/BootScene.js';
import { PreloadScene } from './scenes/PreloadScene.js';
import { MainMenuScene } from './scenes/MainMenuScene.js';
import { LevelScene } from './scenes/LevelScene.js';
import { ResultScene } from './scenes/ResultScene.js';

// Accessibility: respect OS reduced-motion preference (also see setReducedMotion()).
if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  setReducedMotion(true);
}

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: WORLD.width,
  height: WORLD.height,
  backgroundColor: '#1a1a22',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, PreloadScene, MainMenuScene, LevelScene, ResultScene],
};

// eslint-disable-next-line no-new
new Phaser.Game(config);
