import Phaser from 'phaser';
import { WORLD } from './config/gameConfig.js';
import { setReducedMotion } from './anim/motion.js';

import { BootScene } from './scenes/BootScene.js';
import { PreloadScene } from './scenes/PreloadScene.js';
import { MainMenuScene } from './scenes/MainMenuScene.js';
import { LevelSelectScene } from './scenes/LevelSelectScene.js';
import { AlbumScene } from './scenes/AlbumScene.js';
import { CutsceneScene } from './scenes/CutsceneScene.js';
import { LevelScene } from './scenes/LevelScene.js';
import { ResultScene } from './scenes/ResultScene.js';
import { TutorialScene } from './scenes/TutorialScene.js';
import { PauseScene } from './scenes/PauseScene.js';

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
  scene: [BootScene, PreloadScene, MainMenuScene, LevelSelectScene, AlbumScene, CutsceneScene, LevelScene, ResultScene, TutorialScene, PauseScene],
};

function startGame() {
  new Phaser.Game(config);
}

const fontsToLoad = ['400 1em "Knewave"', '400 1em "Darumadrop One"'];
if (document.fonts && document.fonts.load) {
  Promise.all(fontsToLoad.map((f) => document.fonts.load(f)))
    .then(() => document.fonts.ready)
    .catch(() => {})
    .finally(startGame);
} else {
  startGame();
}
