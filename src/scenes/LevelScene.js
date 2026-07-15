// LevelScene — STABLE. Creates the zoomable world layer, sets the background, and
// calls the three system entry points. Do not add gameplay here; build inside
// camera/ domain/ ui/.
import Phaser from "phaser";
import { bus } from "../core/EventBus.js";
import { EVENTS } from "../config/events.js";
import { LEVELS } from "./levels.js";
import { fadeScene } from "../anim/motion.js";
import { FONTS } from "../config/fonts.js";

import { initCameraSystem } from "../camera/index.js";
import { initLogicSystem } from "../domain/index.js";
import { initUISystem } from "../ui/index.js";

export class LevelScene extends Phaser.Scene {
  constructor() {
    super("LevelScene");
  }

  init(data) {
    this.levelIndex = data.levelIndex ?? 0;
    this.levelData = LEVELS[this.levelIndex];
  }

  create() {
    const level = this.levelData;
    const { width: W, height: H } = this.cameras.main;
    this.cameras.main.setBackgroundColor(level.bgColor || "#3a3a44");
    fadeScene(this, "in");

    // World layer — everything here is zoomed by the camera tool. Screen-space UI
    // (HUD, overlay, rail, dialog) lives outside it and is never scaled.
    this.world = this.add.container(0, 0);
    const bg = this.add.rectangle(
      W / 2,
      H / 2,
      W,
      H,
      Phaser.Display.Color.HexStringToColor(level.bgColor || "#3a3a44").color,
      1,
    );
    const ground = this.add.rectangle(
      W / 2,
      H * 0.86,
      W,
      H * 0.28,
      0x000000,
      0.12,
    );
    this.world.add([bg, ground]);

    // Brief level title card (screen-space, fades in/out).
    const title = this.add
      .text(W / 2, 70, level.name, {
        fontFamily: FONTS.display,
        fontSize: "26px",
        color: "#ffffff",
      })
      .setOrigin(0.5)
      .setDepth(700)
      .setAlpha(0);
    this.tweens.add({
      targets: title,
      alpha: 1,
      duration: 400,
      yoyo: true,
      hold: 1400,
      ease: "Sine.easeInOut",
      onComplete: () => title.destroy(),
    });

    // --- the three systems (stable contract) ---
    initLogicSystem(this, bus, level); // PhotoObjects -> added into this.world
    initCameraSystem(this, bus, level); // zoom + overlay + intro
    initUISystem(this, bus, level); // HUD, rail, dialog

    // --- Confirm -> finalize -> result panel ---
    bus.once(EVENTS.LEVEL_COMPLETED, (payload) => {
      fadeScene(this, "out", {
        onComplete: () =>
          this.scene.start("ResultScene", {
            ...payload,
            levelIndex: this.levelIndex,
            levelName: level.name,
          }),
      });
    });
  }
}
export default LevelScene;
