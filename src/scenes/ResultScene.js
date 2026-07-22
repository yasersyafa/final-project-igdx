// ResultScene — the result panel. Reveals which missions were actually captured
// across the roll (the risk of confirming early), the score, and a grade.
import Phaser from "phaser";
import { LEVELS } from "./levels.js";
import { gradeForFrac, starsForFrac, recordResult } from "../core/progress.js";
import { popIn, gradeReveal, checkPop, fadeScene } from "../anim/motion.js";
import { makeButton } from "../ui/Button.js";
import { FONTS } from "../config/fonts.js";
import { t, L } from "../core/i18n.js";

export class ResultScene extends Phaser.Scene {
  constructor() {
    super("ResultScene");
  }
  init(data) {
    this.payload = data || {};
  }

  create() {
    const { width: W, height: H } = this.cameras.main;
    this.cameras.main.setBackgroundColor("#20242f");
    fadeScene(this, "in");

    const total = Math.round(this.payload.total ?? 0);
    const max = this.payload.max ?? 0;
    const frac = max > 0 ? total / max : 0;
    const levelIndex = this.payload.levelIndex ?? 0;
    const results = this.payload.missionResults ?? [];

    const { grade, color } = gradeForFrac(frac);
    const stars = starsForFrac(frac);
    // Persist best result; celebrate if this run beat the stored best.
    const { improved } = recordResult(levelIndex, { frac, total });

    const head = this.add
      .text(W / 2, 70, this.payload.levelName || t("result.title"), {
        fontFamily: FONTS.display,
        fontSize: "32px",
        color: "#fff5e6",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    popIn(head);

    // Mission breakdown list (staggered reveal).
    const doneCount = results.filter((r) => r.done).length;
    const listX = W / 2 - 280;
    let y = 150;
    results.forEach((r, i) => {
      const row = this.add.container(listX, y);
      const mark = this.add
        .text(0, 0, r.done ? "✓" : "✗", {
          fontFamily: FONTS.body,
          fontSize: "24px",
          color: r.done ? "#9be07a" : "#d98a8a",
          fontStyle: "bold",
        })
        .setOrigin(0.5)
        .setScale(0);
      const name = this.add
        .text(28, -12, `${r.name}${r.isSpecial ? "  ★" : ""}`, {
          fontFamily: FONTS.body,
          fontSize: "18px",
          color: r.done ? "#ffffff" : "#9b958a",
        })
        .setOrigin(0, 0);
      const sub = this.add
        .text(
          28,
          10,
          r.done
            ? `${L(r.mission)} — ${t("result.pts", { score: r.score })}`
            : `${L(r.mission)} — ${t("result.missed")}`,
          {
            fontFamily: FONTS.body,
            fontSize: "13px",
            color: "#a39d92",
          },
        )
        .setOrigin(0, 0);
      row.add([mark, name, sub]);
      checkPop(mark, { delay: 200 + i * 120 }); // staggered, overshoot
      y += 56;
    });

    const summary = this.add
      .text(
        W / 2,
        y + 16,
        t("result.summary", {
          done: doneCount,
          total: results.length,
          score: total,
          max,
        }),
        {
          fontFamily: FONTS.body,
          fontSize: "22px",
          color: "#fff5e6",
        },
      )
      .setOrigin(0.5);
    popIn(summary, { delay: 200 + results.length * 120 });

    const gradeT = this.add
      .text(W / 2, y + 80, grade, {
        fontFamily: FONTS.display,
        fontSize: "64px",
        color,
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    gradeReveal(gradeT, {});

    // Star row (★★★ / ★★☆) — staggered pop, each star its own object.
    const starY = y + 132;
    const gap = 44;
    for (let i = 0; i < 3; i++) {
      const filled = i < stars;
      const star = this.add
        .text(W / 2 + (i - 1) * gap, starY, "★", {
          fontFamily: FONTS.body,
          fontSize: "36px",
          color: filled ? "#ffd24a" : "#4a4f5c",
          fontStyle: "bold",
        })
        .setOrigin(0.5);
      checkPop(star, { delay: 400 + i * 130 });
    }

    if (improved) {
      const best = this.add
        .text(W / 2, starY + 42, t("result.newbest"), {
          fontFamily: FONTS.body,
          fontSize: "20px",
          color: "#9be07a",
          fontStyle: "bold",
        })
        .setOrigin(0.5);
      popIn(best, { delay: 400 + 3 * 130 });
    }

    const hasNext = levelIndex < LEVELS.length - 1;
    const by = H - 60;
    if (hasNext) {
      const next = this._button(W / 2 - 130, by, t("btn.nextlevel"), 0x7bbf6a, () =>
        this._go("CutsceneScene", { levelIndex: levelIndex + 1 }),
      );
      popIn(next, { delay: 500 });
    }
    const menu = this._button(
      W / 2 + (hasNext ? 130 : 0),
      by,
      t("btn.levels"),
      0x4a5a7a,
      () => this._go("LevelSelectScene"),
    );
    popIn(menu, { delay: 560 });
  }

  _go(scene, data) {
    fadeScene(this, "out", { onComplete: () => this.scene.start(scene, data) });
  }

  _button(x, y, label, color, onClick, w = 220, h = 56) {
    return makeButton(this, {
      x,
      y,
      w,
      h,
      label,
      color,
      fontSize: 22,
      onClick,
    });
  }
}
export default ResultScene;
