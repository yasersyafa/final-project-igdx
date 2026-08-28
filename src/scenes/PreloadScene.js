// PreloadScene — asset pipeline with a loading bar.
// No real art yet: placeholder shapes are drawn by PhotoObject / scenes directly.
// The pipeline below is structured so swapping in real assets is just adding load calls
// and registering idle animations by the same keys the level data references.
import Phaser from "phaser";
import { EASE, DUR } from "../anim/motion.js";
import { FONTS, letterSpacing } from "../config/fonts.js";
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

    // --- REAL ASSET PIPELINE
    this.load.audio("sfx_button_click", "src/sounds/sfx/button-clicked.wav");
    this.load.audio("sfx_button_hover", "src/sounds/sfx/button-hovered.wav");
    this.load.audio("sfx_shutter_click", "src/sounds/sfx/shutter-clicked.mp3");
    this.load.audio(
      "sfx_camera_captured",
      "src/sounds/sfx/camera-captured.mp3",
    );
    this.load.audio(
      "sfx_perfect_captured",
      "src/sounds/sfx/perfect-captured.mp3",
    );
    this.load.audio(
      "sfx_level_enter",
      "src/sounds/sfx/level-enter-clicked.wav",
    );
    this.load.audio("bgm_maluku", "src/sounds/soundtrack/Maluku_BGM.mp3");
    this.load.audio("bgm_sulut", "src/sounds/soundtrack/Sulut_BGM.mp3");
    this.load.image("bg_maluku", "src/arts/level-1/background.png");
    this.load.image("honai_1", "src/arts/level-1/karowari.png");
    this.load.image("bakar_batu_1", "src/arts/level-1/api-1.png");
    this.load.image("bakar_batu_2", "src/arts/level-1/api-2.png");
    this.load.image("bakar_batu_3", "src/arts/level-1/api-3.png");
    this.load.image("sagu_1", "src/arts/level-1/sagu-1.png");
    this.load.image("sagu_2", "src/arts/level-1/sagu-2.png");
    this.load.image("tahuri_1", "src/arts/level-1/tahuri-1.png");
    this.load.image("tahuri_2", "src/arts/level-1/tahuri-2.png");
    this.load.image("tahuri_3", "src/arts/level-1/tahuri-3.png");
    this.load.image("tifa_1", "src/arts/level-1/tifa-1.png");
    this.load.image("tifa_2", "src/arts/level-1/tifa-2.png");
    this.load.image("tifa_3", "src/arts/level-1/tifa-3.png");
    this.load.image("rumba_1", "src/arts/level-1/rumba-1.png");
    this.load.image("rumba_2", "src/arts/level-1/rumba-2.png");
    this.load.image("rumba_3", "src/arts/level-1/rumba-3.png");
    this.load.image("bg_manado", "src/arts/level-2/background.png");
    this.load.image("cakalang_closed", "src/arts/level-2/Cakalangfufu_Closed.png");
    this.load.image("cakalang_open_1", "src/arts/level-2/Cakalangfufu_Open_1.png");
    this.load.image("cakalang_open_2", "src/arts/level-2/Cakalangfufu_Open_2.png");
    this.load.image("rumah_wale", "src/arts/level-2/wale.png");
    this.load.image("kolintang_1", "src/arts/level-2/Kolintang_1.png");
    this.load.image("kolintang_2", "src/arts/level-2/Kolintang_2.png");
    this.load.image("kolintang_3", "src/arts/level-2/Kolintang_3.png");
    this.load.image("kolintang_4", "src/arts/level-2/Kolintang_4.png");
    this.load.image("tulude_1", "src/arts/level-2/Tulude_1.png");
    this.load.image("tulude_2", "src/arts/level-2/Tulude_2.png");
    this.load.image("tagonggong_1", "src/arts/level-2/Tagonggong_1.png");
    this.load.image("tagonggong_2", "src/arts/level-2/Tagonggong_2.png");
    this.load.image("decor_baby", "src/arts/level-2/decor-1.png");
    this.load.image("decor_corgi", "src/arts/level-2/decor-2.png");
    this.load.image("ui_dialogue_box", "src/arts/ui/dialogue-box.png");
    this.load.image("ui_dialogue_name", "src/arts/ui/dialogue-name.png");
    this.load.image("girl_happy", "src/arts/characters/girl/happy.png");
    this.load.image("girl_confused", "src/arts/characters/girl/confused.png");
    this.load.image("photo_border", "src/arts/album/photo-border.png");
    this.load.image("photo_border_active", "src/arts/album/photo-border-active.png");
    this.load.image("album_book", "src/arts/album/album-book.png");
    this.load.image("scroll_track", "src/arts/ui/outer-scroll.png");
    this.load.image("scroll_thumb", "src/arts/ui/scroll-handler.png");
    // For now load nothing else real; ensure the bar still animates to 100%.
    for (let i = 0; i < 8; i++) this.load.image(`__pad_${i}`, this._blankURI());
  }

  create() {
    // --- REGISTER idleAnim ANIMATIONS HERE when real spritesheets exist ----
    // (Idle motion is procedural for now — see src/anim/motion.js.)
    this.anims.create({
      key: "anim_bakarbatu",
      frames: [
        { key: "bakar_batu_1" },
        { key: "bakar_batu_2" },
        { key: "bakar_batu_3" },
      ],
      frameRate: 6,
      repeat: -1,
    });
    this.anims.create({
      key: "anim_sagu",
      frames: [{ key: "sagu_1" }, { key: "sagu_2" }],
      frameRate: 2,
      repeat: -1,
    });
    this.anims.create({
      key: "anim_tahuri",
      frames: [{ key: "tahuri_1" }, { key: "tahuri_2" }, { key: "tahuri_3" }],
      frameRate: 4,
      repeat: -1,
    });
    this.anims.create({
      key: "anim_tifa",
      frames: [{ key: "tifa_1" }, { key: "tifa_2" }, { key: "tifa_3" }],
      frameRate: 4,
      repeat: -1,
    });
    this.anims.create({
      key: "anim_rumba",
      frames: [{ key: "rumba_1" }, { key: "rumba_2" }, { key: "rumba_3" }],
      frameRate: 4,
      repeat: -1,
    });
    this.anims.create({
      key: "anim_kolintang",
      frames: [
        { key: "kolintang_1" },
        { key: "kolintang_2" },
        { key: "kolintang_3" },
        { key: "kolintang_4" },
      ],
      frameRate: 6,
      repeat: -1,
    });
    this.anims.create({
      key: "anim_tulude",
      frames: [{ key: "tulude_1" }, { key: "tulude_2" }],
      frameRate: 2,
      repeat: -1,
    });
    this.anims.create({
      key: "anim_cakalang_open",
      frames: [{ key: "cakalang_open_1" }, { key: "cakalang_open_2" }],
      frameRate: 2,
      repeat: -1,
    });
    this.anims.create({
      key: "anim_tagonggong",
      frames: [{ key: "tagonggong_1" }, { key: "tagonggong_2" }],
      frameRate: 4,
      repeat: -1,
    });

    // Wire the AudioManager observer once; it listens on EventBus for the rest
    // of the game's life (this.sound is Phaser's shared, game-wide sound manager).
    AudioManager.init(this.sound);

    this._showTapToStart();
  }

  // Browsers block AudioContext until a real user gesture (click/tap/key —
  // mouse move does NOT count). Shown after loading so the bar isn't gated on
  // it; resumes the audio context inside the same gesture handler.
  _showTapToStart() {
    const { width: W, height: H } = this.cameras.main;

    const dim = this.add
      .rectangle(0, 0, W, H, 0x0a0a12, 1)
      .setOrigin(0, 0)
      .setDepth(3000);
    const label = this.add
      .text(W / 2, H / 2, t("boot.tapstart"), {
        fontFamily: FONTS.display,
        fontSize: "28px",
        letterSpacing: letterSpacing(28),
        color: "#fff5e6",
      })
      .setOrigin(0.5)
      .setDepth(3001);
    this.tweens.add({
      targets: label,
      alpha: 0.4,
      ease: EASE.inOut,
      duration: 700,
      yoyo: true,
      repeat: -1,
    });

    dim.setInteractive();
    const start = () => {
      dim.disableInteractive();
      this.input.keyboard && this.input.keyboard.off("keydown", start);
      if (
        this.sound &&
        this.sound.context &&
        this.sound.context.state === "suspended"
      ) {
        this.sound.context.resume().catch(() => {});
      }
      this.cameras.main.fadeOut(DUR.fade, 0, 0, 0);
      this.cameras.main.once("camerafadeoutcomplete", () =>
        this.scene.start("MainMenuScene"),
      );
    };
    dim.once("pointerdown", start);
    this.input.keyboard && this.input.keyboard.once("keydown", start);
  }

  _blankURI() {
    return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQDJ/pLvAAAAAElFTkSuQmCC";
  }
}
export default PreloadScene;
