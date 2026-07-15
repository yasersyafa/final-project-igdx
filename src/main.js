// Phaser game bootstrap. Scene flow: Boot -> Preload -> MainMenu -> LevelSelect -> Cutscene -> Level -> Result.
import Phaser from 'phaser';
import { WORLD } from './config/gameConfig.js';
import { setReducedMotion } from './anim/motion.js';

import { BootScene } from './scenes/BootScene.js';
import { PreloadScene } from './scenes/PreloadScene.js';
import { MainMenuScene } from './scenes/MainMenuScene.js';
import { LevelSelectScene } from './scenes/LevelSelectScene.js';
import { GalleryScene } from './scenes/GalleryScene.js';
import { CutsceneScene } from './scenes/CutsceneScene.js';
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
  scene: [BootScene, PreloadScene, MainMenuScene, LevelSelectScene, GalleryScene, CutsceneScene, LevelScene, ResultScene],
};

// Wait for the web fonts (Baloo 2 / Nunito) before starting so canvas text renders
// in the right face instead of a fallback. Falls back gracefully if fonts/API fail.
function startGame() {
  // eslint-disable-next-line no-new
  new Phaser.Game(config);
}

const fontsToLoad = ['600 1em "Baloo 2"', '700 1em "Baloo 2"', '400 1em "Nunito"', '600 1em "Nunito"'];
if (document.fonts && document.fonts.load) {
  Promise.all(fontsToLoad.map((f) => document.fonts.load(f)))
    .then(() => document.fonts.ready)
    .catch(() => {})
    .finally(startGame);
} else {
  startGame();
}
