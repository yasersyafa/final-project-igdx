// CutsceneScene — cinematic intro before each level. Dark screen + letterbox bars,
// per-level narration cards fade in/out one at a time, then the level loads.
// Content comes from level.cutscene (array of strings; "\n" allowed for two lines).
// Skippable: click/space advances the current card; "Skip ▸" jumps into the level.
import Phaser from "phaser";
import { LEVELS } from "./levels.js";
import { fadeScene, motionFlags, EASE, DUR } from "../anim/motion.js";
import { FONTS } from "../config/fonts.js";

const BAR_H = 90;

export class CutsceneScene extends Phaser.Scene {
  constructor() {
    super("CutsceneScene");
  }

  init(data) {
    this.levelIndex = data?.levelIndex ?? 0;
    this.level = LEVELS[this.levelIndex];
    this.cards =
      this.level && Array.isArray(this.level.cutscene)
        ? this.level.cutscene
        : [];
  }

  create() {
    const { width: W, height: H } = this.cameras.main;
    this.cameras.main.setBackgroundColor("#20242f");
    this.finished = false;
    this.holdEvent = null;
    this.textTween = null;

    // No cutscene for this level -> go straight in.
    if (this.cards.length === 0) {
      this._finish();
      return;
    }

    fadeScene(this, "in");

    // Letterbox bars (top/bottom). Instant when reduced motion.
    const barTop = this.add
      .rectangle(0, 0, W, BAR_H, 0x000000, 1)
      .setOrigin(0, 0)
      .setDepth(10);
    const barBot = this.add
      .rectangle(0, H, W, BAR_H, 0x000000, 1)
      .setOrigin(0, 1)
      .setDepth(10);
    if (motionFlags.reduced) {
      barTop.y = 0;
      barBot.y = H;
    } else {
      barTop.y = -BAR_H;
      barBot.y = H + BAR_H;
      this.tweens.add({
        targets: barTop,
        y: 0,
        ease: EASE.out,
        duration: DUR.base,
      });
      this.tweens.add({
        targets: barBot,
        y: H,
        ease: EASE.out,
        duration: DUR.base,
      });
    }

    // Level-name eyebrow.
    this.add
      .text(W / 2, BAR_H + 34, (this.level.name || "").toUpperCase(), {
        fontFamily: FONTS.body,
        fontSize: "14px",
        color: "#8b93a7",
        letterSpacing: 2,
      })
      .setOrigin(0.5)
      .setDepth(11);

    // Center narration.
    this.card = this.add
      .text(W / 2, H / 2, "", {
        fontFamily: FONTS.body,
        fontSize: "30px",
        color: "#fff5e6",
        align: "center",
        wordWrap: { width: W - 240 },
        lineSpacing: 10,
      })
      .setOrigin(0.5)
      .setDepth(11)
      .setAlpha(0);

    // Full-screen advance zone (below Skip). Phaser input is topOnly by default,
    // so a click on the Skip text hits Skip, not this zone.
    const zone = this.add
      .zone(0, 0, W, H)
      .setOrigin(0, 0)
      .setDepth(1)
      .setInteractive({ useHandCursor: false });
    zone.on("pointerdown", () => this._next());

    // Skip button (on top).
    const skip = this.add
      .text(W - 28, H - 26, "Skip  ▸", {
        fontFamily: FONTS.display,
        fontSize: "16px",
        color: "#c9c2b6",
      })
      .setOrigin(1, 0.5)
      .setDepth(12)
      .setInteractive({ useHandCursor: true });
    skip.on("pointerover", () => skip.setColor("#ffffff"));
    skip.on("pointerout", () => skip.setColor("#c9c2b6"));
    skip.on("pointerdown", () => this._finish());

    // Space also advances.
    this._advance = () => this._next();
    this.spaceKey = this.input.keyboard.addKey("SPACE");
    this.spaceKey.on("down", this._advance);

    this.events.once("shutdown", () => {
      this.spaceKey && this.spaceKey.off("down", this._advance);
    });

    this.index = 0;
    this._showCard(0);
  }

  _showCard(i) {
    if (this.finished) return;
    this.index = i;
    const holdMs = motionFlags.reduced ? 900 : 2000;
    this.card.setText(String(this.cards[i] ?? ""));
    this.card.setAlpha(0);
    // Fade in, hold, then auto-advance.
    this.textTween = this.tweens.add({
      targets: this.card,
      alpha: 1,
      ease: EASE.out,
      duration: DUR.base,
      onComplete: () => {
        this.holdEvent = this.time.delayedCall(holdMs, () => this._next());
      },
    });
  }

  // Advance: if a card is still fading/holding, jump to the next; else next card.
  _next() {
    if (this.finished) return;
    if (this.holdEvent) {
      this.holdEvent.remove(false);
      this.holdEvent = null;
    }
    if (this.textTween && this.textTween.isPlaying()) {
      this.textTween.stop();
      this.card.setAlpha(1);
    }

    if (this.index >= this.cards.length - 1) {
      this._finish();
      return;
    }
    const nextIndex = this.index + 1;
    // Fade current card out, then show the next.
    this.tweens.add({
      targets: this.card,
      alpha: 0,
      ease: EASE.in,
      duration: DUR.quick,
      onComplete: () => this._showCard(nextIndex),
    });
  }

  _finish() {
    if (this.finished) return;
    this.finished = true;
    if (this.holdEvent) {
      this.holdEvent.remove(false);
      this.holdEvent = null;
    }
    fadeScene(this, "out", {
      onComplete: () =>
        this.scene.start("LevelScene", { levelIndex: this.levelIndex }),
    });
  }
}

export default CutsceneScene;
