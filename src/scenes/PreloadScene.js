// PreloadScene — asset pipeline with a loading bar.
// No real art yet: placeholder shapes are drawn by PhotoObject / scenes directly.
// The pipeline below is structured so swapping in real assets is just adding load calls
// and registering idle animations by the same keys the level data references.
import Phaser from "phaser";
import { EASE, DUR } from "../anim/motion.js";
import { FONTS } from "../config/fonts.js";
import { t } from "../core/i18n.js";
import * as AudioManager from "../core/AudioManager.js";

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super("PreloadScene");
  }

  preload() {
    const { width: W, height: H } = this.cameras.main;

    // --- loading bar ---
    const barW = 420,
      barH = 18;
    const bx = W / 2 - barW / 2,
      by = H / 2;
    this.add
      .text(W / 2, by - 40, t("preload.loading"), {
        fontFamily: FONTS.body,
        fontSize: "22px",
        color: "#fff5e6",
      })
      .setOrigin(0.5);
    this.add
      .rectangle(bx, by, barW, barH, 0x000000, 0.4)
      .setOrigin(0, 0.5)
      .setStrokeStyle(2, 0xffffff, 0.4);
    const fill = this.add
      .rectangle(bx, by, 0, barH, 0xffe08a, 1)
      .setOrigin(0, 0.5);
    this.load.on("progress", (p) => (fill.width = barW * p));

    // --- REAL ASSET PIPELINE (swap-in point) -------------------------------
    // Backgrounds:    this.load.image('bg_park', 'assets/bg/park.png');
    // Object atlases: this.load.atlas('cat', 'assets/cat.png', 'assets/cat.json');
    // Audio:          this.load.audio('shutter', 'assets/sfx/shutter.mp3');
    this.load.audio('sfx_button_click', 'src/sounds/sfx/button-clicked.wav');
    this.load.audio('sfx_button_hover', 'src/sounds/sfx/button-hovered.mp3');
    this.load.audio('sfx_shutter_click', 'src/sounds/sfx/shutter-clicked.mp3');
    this.load.audio('sfx_camera_captured', 'src/sounds/sfx/camera-captured.mp3');
    this.load.audio('sfx_perfect_captured', 'src/sounds/sfx/perfect-captured.mp3');
    this.load.audio('sfx_level_enter', 'src/sounds/sfx/level-enter-clicked.wav');
    // For now load nothing else real; ensure the bar still animates to 100%.
    for (let i = 0; i < 8; i++) this.load.image(`__pad_${i}`, this._blankURI());
  }

  create() {
    // --- REGISTER idleAnim ANIMATIONS HERE when real spritesheets exist ----
    // this.anims.create({ key: 'cat_breathe', frames: ..., repeat: -1 });
    // (Idle motion is procedural for now — see src/anim/motion.js.)

    // Wire the AudioManager observer once; it listens on EventBus for the rest
    // of the game's life (this.sound is Phaser's shared, game-wide sound manager).
    AudioManager.init(this.sound);

    // brief bar settle then go to menu
    this.cameras.main.fadeOut(DUR.fade, 0, 0, 0);
    this.cameras.main.once("camerafadeoutcomplete", () =>
      this.scene.start("MainMenuScene"),
    );
  }

  _blankURI() {
    return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQDJ/pLvAAAAAElFTkSuQmCC";
  }
}
export default PreloadScene;
