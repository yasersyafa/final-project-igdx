// SettingsDialog — modal opened from the main menu's Settings button. Holds the
// global language choice (English / Bahasa Indonesia), the single source of truth
// the Album reads for its field notes, plus which edge the in-level sidebar
// drawer docks to. Persisted via core/settings.js.
// Modeled on ui/LevelInfoDialog.js — the scene owns one instance and calls open().
import { popIn, popOut, EASE, DUR } from "../anim/motion.js";
import { makeButton } from "./Button.js";
import { ConfirmDialog } from "./ConfirmDialog.js";
import { FONTS } from "../config/fonts.js";
import { THEME } from "../config/theme.js";
import { LANGUAGES } from "../config/languages.js";
import { getLang, setLang, getSidebarSide, setSidebarSide } from "../core/settings.js";
import { resetProgress } from "../core/progress.js";
import { resetGallery } from "../core/gallery.js";
import { t } from "../core/i18n.js";

const OPT_W = 300,
  OPT_H = 48,
  OPT_GAP = 12;
const ON = THEME.play,
  OFF = 0xf7c3ce;
const SIDES = [
  { code: "left", key: "settings.sideleft" },
  { code: "right", key: "settings.sideright" },
];

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
      PAD + TITLE_H + LABEL_H + GAP_LABEL + optsH
      + GAP_LABEL + LABEL_H + GAP_LABEL + OPT_H // sidebar-position section
      + GAP_LABEL + OPT_H // reset-progress section
      + GAP_CLOSE + CLOSE_H + PAD;

    this.panel = scene.add
      .container(W / 2, H / 2)
      .setDepth(depth + 1)
      .setVisible(false);
    const bg = scene.add
      .rectangle(0, 0, pw, ph, 0xfef2c4, 0.98)
      .setOrigin(0.5)
      .setStrokeStyle(3, THEME.panelBorder, 0.9);

    let y = -ph / 2 + PAD; // running top edge cursor
    this.title = scene.add
      .text(0, y + TITLE_H / 2, t("settings.title"), {
        fontFamily: FONTS.display,
        fontSize: "30px",
        color: THEME.ink,
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    y += TITLE_H;
    this.langLabel = scene.add
      .text(0, y + LABEL_H / 2, t("settings.language"), {
        fontFamily: FONTS.body,
        fontSize: "18px",
        color: THEME.muted,
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
        .setStrokeStyle(2, THEME.panelBorder, 0.6)
        .setInteractive({ useHandCursor: true });
      const txt = scene.add
        .text(0, oy, l.label, {
          fontFamily: FONTS.display,
          fontSize: "20px",
          color: THEME.ink,
        })
        .setOrigin(0.5);
      rect.on("pointerdown", () => this._select(l.code));
      this.panel.add([rect, txt]);
      return { code: l.code, rect };
    });
    y += optsH + GAP_LABEL;

    // Sidebar drawer position — Left/Right side by side (only 2 options, so a
    // single row reads better than LANGUAGES' vertical list).
    this.sideLabel = scene.add
      .text(0, y + LABEL_H / 2, t("settings.sidebarposition"), {
        fontFamily: FONTS.body,
        fontSize: "18px",
        color: THEME.muted,
      })
      .setOrigin(0.5);
    y += LABEL_H + GAP_LABEL;
    this.panel.add(this.sideLabel);

    const sideOptW = (OPT_W - OPT_GAP) / 2;
    const sideOptY = y + OPT_H / 2;
    this._sideOpts = SIDES.map((s, i) => {
      const ox = (-OPT_W / 2 + sideOptW / 2) + i * (sideOptW + OPT_GAP);
      const rect = scene.add
        .rectangle(ox, sideOptY, sideOptW, OPT_H, OFF, 1)
        .setStrokeStyle(2, THEME.panelBorder, 0.6)
        .setInteractive({ useHandCursor: true });
      const txt = scene.add
        .text(ox, sideOptY, t(s.key), {
          fontFamily: FONTS.display,
          fontSize: "18px",
          color: THEME.ink,
        })
        .setOrigin(0.5);
      rect.on("pointerdown", () => this._selectSide(s.code));
      this.panel.add([rect, txt]);
      return { code: s.code, rect, txt, key: s.key };
    });
    y += OPT_H + GAP_LABEL;

    // Reset progress — a destructive action, so it opens a confirm dialog rather
    // than firing straight away. Own ConfirmDialog instance, layered above this panel.
    this.resetConfirm = new ConfirmDialog(scene, depth + 50);
    this.resetBtn = makeButton(scene, {
      x: 0,
      y: y + OPT_H / 2,
      w: OPT_W,
      h: OPT_H,
      label: t("settings.resetprogress"),
      color: THEME.danger,
      fontSize: 18,
      depth: depth + 2,
      stopPropagation: true,
      onClick: () => this._confirmReset(),
    });
    this.panel.add(this.resetBtn);
    y += OPT_H + GAP_CLOSE;

    this.closeBtn = makeButton(scene, {
      x: 0,
      y: y + CLOSE_H / 2,
      w: 160,
      h: CLOSE_H,
      label: t("btn.close"),
      color: THEME.album,
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

  _selectSide(code) {
    setSidebarSide(code);
    this._refresh();
  }

  _confirmReset() {
    this.resetConfirm.open({
      message: t("confirm.resetprogress"),
      confirmLabel: t("btn.reset"),
      cancelLabel: t("btn.cancel"),
      onConfirm: () => { resetProgress(); resetGallery(); },
    });
  }

  // Highlight the options matching the persisted settings, and refresh the
  // dialog's own localized labels so they switch immediately on change.
  _refresh() {
    const cur = getLang();
    this._opts.forEach((o) => o.rect.setFillStyle(o.code === cur ? ON : OFF, 1));
    const curSide = getSidebarSide();
    this._sideOpts.forEach((o) => {
      o.rect.setFillStyle(o.code === curSide ? ON : OFF, 1);
      o.txt.setText(t(o.key));
    });
    this.title.setText(t("settings.title"));
    this.langLabel.setText(t("settings.language"));
    this.sideLabel.setText(t("settings.sidebarposition"));
    this.resetBtn.label.setText(t("settings.resetprogress"));
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
