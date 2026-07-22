import Phaser from "phaser";
import { popIn, fadeScene, DUR, idleBob } from "../anim/motion.js";
import { makeButton } from "../ui/Button.js";
import { SettingsDialog } from "../ui/SettingsDialog.js";
import { FONTS } from "../config/fonts.js";
import { t } from "../core/i18n.js";

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

    this.add
      .text(W / 2, H * 0.28 + 56, t("menu.subtitle"), {
        fontFamily: FONTS.body,
        fontSize: "20px",
        color: "#c9c2b6",
      })
      .setOrigin(0.5);

    const play = makeButton(this, {
      x: W / 2,
      y: H * 0.58,
      w: 240,
      h: 66,
      label: t("btn.play"),
      color: 0x7bbf6a,
      fontSize: 26,
      onClick: () =>
        fadeScene(this, "out", {
          onComplete: () => this.scene.start("LevelSelectScene"),
        }),
    });
    popIn(play, { delay: 120 });

    this._settings = new SettingsDialog(this);
    const settings = makeButton(this, {
      x: W / 2,
      y: H * 0.58 + 88 + 72,
      w: 240,
      h: 56,
      label: t("btn.settings"),
      color: 0x3a4353,
      fontSize: 22,
      onClick: () => this._settings.open(),
    });
    popIn(settings, { delay: 280 });
  }
}
export default MainMenuScene;
