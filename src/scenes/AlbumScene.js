// AlbumScene — the photo album, reached from the main menu. Shows every level's
// saved photos in a two-page book panel with one tab per level. Photos are stored
// as JPEG data URLs (see core/gallery.js); each is loaded into a texture.
//
// Left page: a thumbnail grid of the active level's photos. Right page: the
// selected photo enlarged plus, for mission captures, its educational field notes
// (random snapshots show none). Before a photo is picked the right page reads
// "No photo selected yet.".
//
// Placeholder art: the book panel is a plain rounded rect (to be swapped for an
// open-book asset) and the level tabs are plain rects (to become book bookmarks).
import Phaser from "phaser";
import { LEVELS } from "./levels.js";
import { photosFor, removePhoto } from "../core/gallery.js";
import { popIn, fadeScene } from "../anim/motion.js";
import { makeButton } from "../ui/Button.js";
import { ConfirmDialog } from "../ui/ConfirmDialog.js";
import { FONTS } from "../config/fonts.js";
import { t, L } from "../core/i18n.js";
import EDU from "../data/education.json";

// Left-page thumbnail grid.
const COLS = 3;
const TW = 118,
  TH = 88;
const GAP_X = 14,
  GAP_Y = 14;

// Tab (bookmark) colors — active is the warm parchment of the open book.
const TAB_ON = 0xefe2c0,
  TAB_OFF = 0x6b5d43;
const BOOK_FILL = 0xefe2c0;

export class AlbumScene extends Phaser.Scene {
  constructor() {
    super("AlbumScene");
  }

  init(data) {
    // Optional starting tab (level index); defaults to the first level.
    this.tab = Phaser.Math.Clamp(data?.levelIndex ?? 0, 0, LEVELS.length - 1);
    this._selectedId = null; // currently selected photo id, or null
  }

  create() {
    const { width: W, height: H } = this.cameras.main;
    this.cameras.main.setBackgroundColor("#20242f");
    fadeScene(this, "in");

    this.confirm = new ConfirmDialog(this);
    this._leftItems = []; // left-page display objects, cleared on re-render
    this._rightItems = []; // right-page display objects, cleared on re-render
    this._scroll = null; // active field-notes scroll state, or null

    // Mouse-wheel scrolling for the (masked) field notes when they overflow.
    this.input.on("wheel", (_p, _over, _dx, dy) => this._scrollBy(dy));

    const head = this.add
      .text(W / 2, H * 0.08, t("album.title"), {
        fontFamily: FONTS.display,
        fontSize: "40px",
        color: "#fff5e6",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    popIn(head);

    // ---- book panel (placeholder for open-book asset) -----------------------
    this.bookW = Math.min(W * 0.82, 980);
    this.bookH = H * 0.66;
    this.bookX = W / 2;
    this.bookY = H * 0.57;
    this.add
      .rectangle(this.bookX, this.bookY, this.bookW, this.bookH, BOOK_FILL, 1)
      .setStrokeStyle(4, 0x9c855a, 1);
    // center "spine" divides the two pages
    this.add
      .rectangle(this.bookX, this.bookY, 3, this.bookH - 40, 0x9c855a, 0.5)
      .setOrigin(0.5);

    // page centers + a shared inner top edge
    this.lpx = this.bookX - this.bookW / 4;
    this.rpx = this.bookX + this.bookW / 4;
    this.pageTop = this.bookY - this.bookH / 2 + 28;
    this.pageBottom = this.bookY + this.bookH / 2 - 24;

    // ---- level tabs (placeholder for bookmark asset) ------------------------
    this._buildTabs();

    const back = makeButton(this, {
      x: W / 2,
      y: H - 40,
      w: 160,
      h: 46,
      label: t("btn.back"),
      color: 0x3a4353,
      fontSize: 18,
      onClick: () =>
        fadeScene(this, "out", {
          onComplete: () => this.scene.start("MainMenuScene"),
        }),
    });
    popIn(back, { delay: 300 });

    this._loadAndRender();
  }

  _buildTabs() {
    const tabW = 150,
      tabH = 40,
      gap = 12;
    // Left-aligned to the book's left edge, with a small inset padding.
    const padL = 20;
    const startX = this.bookX - this.bookW / 2 + padL + tabW / 2;
    const y = this.bookY - this.bookH / 2 - tabH / 2 + 6; // tuck under the top edge
    this._tabs = LEVELS.map((lv, i) => {
      const x = startX + i * (tabW + gap);
      const active = i === this.tab;
      const rect = this.add
        .rectangle(x, y, tabW, tabH, active ? TAB_ON : TAB_OFF, 1)
        .setStrokeStyle(2, 0x9c855a, 1)
        .setInteractive({ useHandCursor: true });
      const txt = this.add
        .text(x, y, lv.name, {
          fontFamily: FONTS.display,
          fontSize: "18px",
          color: active ? "#2b2417" : "#efe2c0",
          fontStyle: "bold",
        })
        .setOrigin(0.5);
      rect.on("pointerdown", () => this._selectTab(i));
      popIn(rect, { delay: 80 + i * 60 });
      return { rect, txt };
    });
  }

  _selectTab(i) {
    if (i === this.tab) return;
    this.tab = i;
    this._selectedId = null;
    this._tabs.forEach((t, j) => {
      const on = j === i;
      t.rect.setFillStyle(on ? TAB_ON : TAB_OFF, 1);
      t.txt.setColor(on ? "#2b2417" : "#efe2c0");
    });
    this._loadAndRender();
  }

  // Info for a captured object: display name (from the level object) + field
  // notes (from src/data/education.json, in the active language). Returns null
  // when the id isn't a known mission object.
  _infoFor(objectId) {
    const obj = (LEVELS[this.tab].objects || []).find((o) => o.id === objectId);
    if (!obj) return null;
    return { name: obj.name, edu: L(EDU[objectId]) };
  }

  _levelId() {
    return LEVELS[this.tab].id;
  }

  // Load any not-yet-loaded photo textures for the active level, then draw.
  _loadAndRender() {
    const photos = photosFor(this._levelId());
    const pending = photos.filter(
      (p) => !this.textures.exists(this._key(p.id)),
    );
    if (pending.length === 0) {
      this._render(photos);
      return;
    }
    pending.forEach((p) => this.load.image(this._key(p.id), p.dataUrl));
    this.load.once("complete", () => this._render(photos));
    this.load.start();
  }

  _key(id) {
    return `gal_${id}`;
  }

  _render(photos) {
    this._renderLeft(photos);
    const sel = photos.find((p) => p.id === this._selectedId) || null;
    this._renderRight(sel);
  }

  // ---- left page: thumbnail grid ------------------------------------------
  _renderLeft(photos) {
    this._leftItems.forEach((o) => o.destroy());
    this._leftItems = [];

    if (photos.length === 0) {
      const empty = this.add
        .text(this.lpx, this.bookY, t("album.empty"), {
          fontFamily: FONTS.body,
          fontSize: "18px",
          color: "#6b5d43",
          align: "center",
        })
        .setOrigin(0.5);
      this._leftItems.push(empty);
      return;
    }

    const rows = Math.ceil(photos.length / COLS);
    const gridW = COLS * TW + (COLS - 1) * GAP_X;
    const gridH = rows * TH + (rows - 1) * GAP_Y;
    const startX = this.lpx - gridW / 2 + TW / 2;
    const startY = this.pageTop + Math.max(0, (this.pageBottom - this.pageTop - gridH) / 2) + TH / 2;

    photos.forEach((p, i) => {
      const cx = startX + (i % COLS) * (TW + GAP_X);
      const cy = startY + Math.floor(i / COLS) * (TH + GAP_Y);
      const key = this._key(p.id);
      const selected = p.id === this._selectedId;

      const img = this.textures.exists(key)
        ? this.add.image(cx, cy, key).setDisplaySize(TW, TH)
        : this.add.rectangle(cx, cy, TW, TH, 0xd8c8a0, 1);
      img.setOrigin(0.5).setInteractive({ useHandCursor: true });
      img.on("pointerdown", () => this._select(p.id));

      const border = this.add
        .rectangle(cx, cy, TW, TH, 0x000000, 0)
        .setOrigin(0.5)
        .setStrokeStyle(selected ? 4 : 2, selected ? 0xc98a2b : 0x9c855a, selected ? 1 : 0.8);

      this._leftItems.push(img, border);

      // A small bookmark marks mission captures (they carry field notes).
      if (p.objectId) {
        const dot = this.add
          .text(cx + TW / 2 - 5, cy - TH / 2 + 3, "📖", { fontSize: "14px" })
          .setOrigin(1, 0);
        this._leftItems.push(dot);
      }

      popIn(img, { delay: 40 + i * 25 });
    });
  }

  _select(id) {
    if (id === this._selectedId) return;
    this._selectedId = id;
    this._render(photosFor(this._levelId()));
  }

  // ---- right page: selected photo + field notes ---------------------------
  _renderRight(photo) {
    this._rightItems.forEach((o) => o.destroy());
    this._rightItems = [];
    this._scroll = null;

    if (!photo) {
      const hint = this.add
        .text(this.rpx, this.bookY, t("album.noselection"), {
          fontFamily: FONTS.body,
          fontSize: "19px",
          color: "#7a6f57",
          align: "center",
          wordWrap: { width: this.bookW / 2 - 70 },
        })
        .setOrigin(0.5);
      this._rightItems.push(hint);
      return;
    }

    const info = photo.objectId ? this._infoFor(photo.objectId) : null;
    const textW = this.bookW / 2 - 80;

    // enlarged photo
    const photoW = Math.min(280, this.bookW / 2 - 90);
    const photoH = photoW * 0.75;
    const py = this.pageTop + photoH / 2;
    const key = this._key(photo.id);
    const img = this.textures.exists(key)
      ? this.add.image(this.rpx, py, key).setDisplaySize(photoW, photoH)
      : this.add.rectangle(this.rpx, py, photoW, photoH, 0xd8c8a0, 1);
    img.setOrigin(0.5);
    const frame = this.add
      .rectangle(this.rpx, py, photoW, photoH, 0x000000, 0)
      .setStrokeStyle(3, 0x9c855a, 1);
    this._rightItems.push(img, frame);

    // title
    const title = this.add
      .text(this.rpx, py + photoH / 2 + 14, info ? info.name : t("album.snapshot"), {
        fontFamily: FONTS.display,
        fontSize: "22px",
        color: "#2b2417",
        fontStyle: "bold",
        align: "center",
        wordWrap: { width: textW },
      })
      .setOrigin(0.5, 0);
    this._rightItems.push(title);

    // Delete pinned to the page bottom. Notes live in the gap above it and
    // scroll if they overflow, so long text never collides with the button.
    const del = makeButton(this, {
      x: this.rpx,
      y: this.pageBottom - 24,
      w: 150,
      h: 44,
      label: t("btn.delete"),
      color: 0xc06060,
      fontSize: 18,
      onClick: () => this._askDelete(photo.id),
    });
    this._rightItems.push(del);

    // Scrollable field-notes region: from below the title to above Delete.
    const regionTop = title.y + title.height + 10;
    const regionBottom = del.y - 22 - 12; // button half-height + gap
    const regionH = regionBottom - regionTop;
    if (regionH < 24) return;

    const body = this.add
      .text(
        this.rpx,
        regionTop,
        info ? info.edu : t("album.randomnote"),
        {
          fontFamily: FONTS.body,
          fontSize: "16px",
          color: info ? "#3a3222" : "#7a6f57",
          align: "center",
          lineSpacing: 4,
          wordWrap: { width: textW },
        },
      )
      .setOrigin(0.5, 0);
    this._rightItems.push(body);

    // Clip the notes to the region so overflow is hidden, not overlapping.
    const regionW = textW + 14;
    const g = this.make.graphics({ add: false });
    g.fillStyle(0xffffff);
    g.fillRect(this.rpx - regionW / 2, regionTop, regionW, regionH);
    body.setMask(g.createGeometryMask());
    this._rightItems.push(g);

    const max = Math.max(0, body.height - regionH);
    if (max <= 0) return; // fits — no scrolling needed

    // Scrollbar thumb (right edge of the region) + drag zone over the notes.
    const trackX = this.rpx + regionW / 2 + 6;
    const thumbH = Math.max(24, (regionH * regionH) / body.height);
    const thumb = this.add
      .rectangle(trackX, regionTop, 5, thumbH, 0x9c855a, 0.8)
      .setOrigin(0.5, 0);
    this._rightItems.push(thumb);

    const zone = this.add
      .zone(this.rpx, regionTop + regionH / 2, regionW, regionH)
      .setInteractive({ useHandCursor: true, draggable: true });
    this._rightItems.push(zone);

    this._scroll = { body, thumb, top: regionTop, regionH, max, thumbH, offset: 0, dragBase: 0, dragY: 0 };

    zone.on("dragstart", (p) => {
      this._scroll.dragBase = this._scroll.offset;
      this._scroll.dragY = p.y;
    });
    zone.on("drag", (p) => {
      const s = this._scroll;
      this._setScroll(s.dragBase + (s.dragY - p.y));
    });

    // A soft hint that there is more to read.
    const more = this.add
      .text(this.rpx, regionBottom + 2, t("album.scrollhint"), {
        fontFamily: FONTS.body,
        fontSize: "12px",
        color: "#9c855a",
      })
      .setOrigin(0.5, 0);
    this._rightItems.push(more);
    this._scroll.moreHint = more;
  }

  // Wheel handler target: scroll the active notes by a wheel delta.
  _scrollBy(dy) {
    if (!this._scroll) return;
    this._setScroll(this._scroll.offset + dy);
  }

  // Apply a clamped scroll offset to the notes body + scrollbar thumb.
  _setScroll(next) {
    const s = this._scroll;
    s.offset = Phaser.Math.Clamp(next, 0, s.max);
    s.body.y = s.top - s.offset;
    s.thumb.y = s.top + (s.offset / s.max) * (s.regionH - s.thumbH);
    if (s.moreHint) s.moreHint.setAlpha(s.offset >= s.max - 1 ? 0 : 1);
  }

  _askDelete(id) {
    this.confirm.open({
      message: t("confirm.deletephoto"),
      onConfirm: () => {
        removePhoto(this._levelId(), id);
        const key = this._key(id);
        if (this.textures.exists(key)) this.textures.remove(key);
        if (this._selectedId === id) this._selectedId = null;
        this._render(photosFor(this._levelId()));
      },
    });
  }
}

export default AlbumScene;
