import Phaser from "phaser";
import { popIn, fadeScene, DUR, idleBob } from "../anim/motion.js";
import { makeButton } from "../ui/Button.js";
import { SettingsDialog } from "../ui/SettingsDialog.js";
import { FONTS } from "../config/fonts.js";
import { t } from "../core/i18n.js";
import { bus } from "../core/EventBus.js";
import { EVENTS } from "../config/events.js";
import { hasSeenTutorial } from "../core/settings.js";

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super("MainMenuScene");
  }

  create() {
    const { width: W, height: H } = this.cameras.main;
    this.cameras.main.setBackgroundColor("#20242f");
    fadeScene(this, "in");

    const title = this.add
      .text(W / 2, H * 0.28, "Photo Walk", {
        fontFamily: FONTS.display,
        fontSize: "64px",
        color: "#fff5e6",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    popIn(title);
    idleBob(title, { amount: 6, duration: DUR.idleBreathe });

    this.subtitle = this.add
      .text(W / 2, H * 0.28 + 56, t("menu.subtitle"), {
        fontFamily: FONTS.body,
        fontSize: "20px",
        color: "#c9c2b6",
      })
      .setOrigin(0.5);

    // Play stays locked until the player has been through the tutorial at
    // least once (src/core/settings.js markTutorialSeen(), set by
    // TutorialScene on both a natural finish and Skip).
    const tutorialDone = hasSeenTutorial();

    this._playHint = this.add
      .text(W / 2, H * 0.58 - 55, t("menu.playlockedhint"), {
        fontFamily: FONTS.body,
        fontSize: "16px",
        color: "#ff9a6b",
      })
      .setOrigin(0.5)
      .setAlpha(0);

    const play = makeButton(this, {
      x: W / 2,
      y: H * 0.58,
      w: 240,
      h: 66,
      label: tutorialDone ? t("btn.play") : t("menu.playlocked"),
      color: tutorialDone ? 0x7bbf6a : 0x3a3f4a,
      fontSize: 26,
      onClick: () => {
        if (!hasSeenTutorial()) { this._denyPlay(play); return; }
        fadeScene(this, "out", {
          onComplete: () => this.scene.start("LevelSelectScene"),
        });
      },
    });
    popIn(play, {
      delay: 120,
      onComplete: () => { if (!tutorialDone) play.setAlpha(0.55); },
    });

    const tutorial = makeButton(this, {
      x: W / 2,
      y: H * 0.58 + 88,
      w: 240,
      h: 56,
      label: t("btn.tutorial"),
      color: 0x5c8a52,
      fontSize: 20,
      onClick: () =>
        fadeScene(this, "out", {
          onComplete: () => this.scene.start("TutorialScene"),
        }),
    });
    popIn(tutorial, { delay: 200 });

    const album = makeButton(this, {
      x: W / 2,
      y: H * 0.58 + 88 + 72,
      w: 240,
      h: 56,
      label: t("btn.album"),
      color: 0x4a5a7a,
      fontSize: 22,
      onClick: () =>
        fadeScene(this, "out", {
          onComplete: () => this.scene.start("AlbumScene"),
        }),
    });
    popIn(album, { delay: 280 });

    this._settings = new SettingsDialog(this);
    const settings = makeButton(this, {
      x: W / 2,
      y: H * 0.58 + 88 + 72 + 72,
      w: 240,
      h: 56,
      label: t("btn.settings"),
      color: 0x3a4353,
      fontSize: 22,
      onClick: () => this._settings.open(),
    });
    popIn(settings, { delay: 360 });

    // Live re-localize so a language change in SettingsDialog updates this
    // scene's text immediately, without needing a scene restart.
    this._onLangChanged = () => {
      this.subtitle.setText(t("menu.subtitle"));
      play.label.setText(tutorialDone ? t("btn.play") : t("menu.playlocked"));
      this._playHint.setText(t("menu.playlockedhint"));
      tutorial.label.setText(t("btn.tutorial"));
      album.label.setText(t("btn.album"));
      settings.label.setText(t("btn.settings"));
    };
    bus.on(EVENTS.LANG_CHANGED, this._onLangChanged);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      bus.off(EVENTS.LANG_CHANGED, this._onLangChanged);
    });
  }

  // Locked-Play feedback: shake the button + flash the hint, mirroring
  // LevelSelectScene's _denied() for a locked level card.
  _denyPlay(btn) {
    const homeX = btn.x;
    this.tweens.killTweensOf(btn);
    this.tweens.add({
      targets: btn, x: homeX + 8, duration: 50, ease: "Sine.inOut",
      yoyo: true, repeat: 3, onComplete: () => { btn.x = homeX; },
    });
    this.tweens.killTweensOf(this._playHint);
    this._playHint.setAlpha(0);
    this.tweens.add({
      targets: this._playHint, alpha: 1, duration: 120, ease: "Sine.out",
      hold: 1200, yoyo: true,
    });
  }
}
export default MainMenuScene;
