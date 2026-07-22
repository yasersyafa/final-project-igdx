// SettingsDialog — modal opened from the main menu's Settings button. Holds the
// global language choice (English / Bahasa Indonesia), the single source of truth
// the Album reads for its field notes. Persisted via core/settings.js.
// Modeled on ui/LevelInfoDialog.js — the scene owns one instance and calls open().
import { popIn, popOut, EASE, DUR } from "../anim/motion.js";
import { makeButton } from "./Button.js";
import { FONTS } from "../config/fonts.js";
import { LANGUAGES } from "../config/languages.js";
import { getLang, setLang } from "../core/settings.js";
import { t } from "../core/i18n.js";

const OPT_W = 300,
  OPT_H = 48,
  OPT_GAP = 12;
const ON = 0x7bbf6a,
  OFF = 0x3a4353;

export class SettingsDialog {
  constructor(scene, depth = 1600) {
    this.scene = scene;
    this.isOpen = false;
    const W = scene.cameras.main.width,
      H = scene.cameras.main.height;

    this.dim = scene.add
      .rectangle(0, 0, W, H, 0x000000, 0)
      .setOrigin(0, 0)
      .setDepth(depth)
      .setVisible(false)
      .setInteractive();
    this.dim.on("pointerdown", () => this.close());

    // Layout is derived top-down so nothing overlaps for any language count.
    const PAD = 26,
      TITLE_H = 34,
      LABEL_H = 26,
      GAP_LABEL = 22,
      GAP_CLOSE = 22,
      CLOSE_H = 48;
    const optsH = LANGUAGES.length * OPT_H + (LANGUAGES.length - 1) * OPT_GAP;
    const pw = 420;
    const ph =
      PAD + TITLE_H + LABEL_H + GAP_LABEL + optsH + GAP_CLOSE + CLOSE_H + PAD;

    this.panel = scene.add
      .container(W / 2, H / 2)
      .setDepth(depth + 1)
      .setVisible(false);
    const bg = scene.add
      .rectangle(0, 0, pw, ph, 0x2b2230, 0.98)
      .setOrigin(0.5)
      .setStrokeStyle(3, 0xffe08a, 0.8);

    let y = -ph / 2 + PAD; // running top edge cursor
    this.title = scene.add
      .text(0, y + TITLE_H / 2, t("settings.title"), {
        fontFamily: FONTS.display,
        fontSize: "30px",
        color: "#fff5e6",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    y += TITLE_H;
    this.langLabel = scene.add
      .text(0, y + LABEL_H / 2, t("settings.language"), {
        fontFamily: FONTS.body,
        fontSize: "18px",
        color: "#c9c2b6",
      })
      .setOrigin(0.5);
    y += LABEL_H + GAP_LABEL;
    this.panel.add([bg, this.title, this.langLabel]);

    // Language options — a vertical list; active is highlighted.
    const firstY = y + OPT_H / 2;
    this._opts = LANGUAGES.map((l, i) => {
      const oy = firstY + i * (OPT_H + OPT_GAP);
      const rect = scene.add
        .rectangle(0, oy, OPT_W, OPT_H, OFF, 1)
        .setStrokeStyle(2, 0xffffff, 0.4)
        .setInteractive({ useHandCursor: true });
      const txt = scene.add
        .text(0, oy, l.label, {
          fontFamily: FONTS.display,
          fontSize: "20px",
          color: "#ffffff",
        })
        .setOrigin(0.5);
      rect.on("pointerdown", () => this._select(l.code));
      this.panel.add([rect, txt]);
      return { code: l.code, rect };
    });
    y += optsH + GAP_CLOSE;

    this.closeBtn = makeButton(scene, {
      x: 0,
      y: y + CLOSE_H / 2,
      w: 160,
      h: CLOSE_H,
      label: t("btn.close"),
      color: 0x4a5a7a,
      fontSize: 20,
      depth: depth + 2,
      stopPropagation: true,
      onClick: () => this.close(),
    });
    this.panel.add(this.closeBtn);
  }

  _select(code) {
    setLang(code);
    this._refresh();
  }

  // Highlight the option matching the persisted language, and refresh the
  // dialog's own localized labels so they switch immediately on change.
  _refresh() {
    const cur = getLang();
    this._opts.forEach((o) => o.rect.setFillStyle(o.code === cur ? ON : OFF, 1));
    this.title.setText(t("settings.title"));
    this.langLabel.setText(t("settings.language"));
    this.closeBtn.label.setText(t("btn.close"));
  }

  open() {
    this._refresh();
    this.isOpen = true;
    this.dim.setVisible(true);
    this.scene.tweens.add({
      targets: this.dim,
      fillAlpha: 0.5,
      ease: EASE.out,
      duration: DUR.base,
    });
    this.panel.setVisible(true);
    popIn(this.panel);
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.scene.tweens.add({
      targets: this.dim,
      fillAlpha: 0,
      ease: EASE.in,
      duration: DUR.base,
      onComplete: () => this.dim.setVisible(false),
    });
    popOut(this.panel, {
      onComplete: () => {
        this.panel.setVisible(true).setScale(1);
        this.panel.setVisible(false);
      },
    });
  }
}

export default SettingsDialog;
