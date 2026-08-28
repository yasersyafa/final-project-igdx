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
import { FONTS, letterSpacing } from "../config/fonts.js";
import { THEME } from "../config/theme.js";
import { t, L } from "../core/i18n.js";
import EDU from "../data/education.json";

// Left-page thumbnail grid.
const COLS = 2;
const TW = 151,
  TH = 112;
const GAP_X = 16,
  GAP_Y = 14;

// Tab (bookmark) colors — active is the warm parchment of the open book.
const TAB_ON = 0xefe2c0,
  TAB_OFF = 0x6b5d43;
const BOOK_FILL = 0xefe2c0;

// Each frame asset's inner (white) photo window as a fraction of the frame's
// own display size — measured off the source art so a photo inset into the
// frame lines up regardless of what size the frame is drawn at. `active` is
// the tilted "picked up" polaroid used for the selected thumbnail; its window
// is a rotated square, so photos placed inside it also need `angle`.
const FRAME_KEY = "photo_border";
const ACTIVE_FRAME_KEY = "photo_border_active";
const FRAME_CONFIGS = {
  [FRAME_KEY]: { innerW: 0.854, innerH: 0.521, innerX: 0.004, innerY: -0.034, angle: 0 },
  [ACTIVE_FRAME_KEY]: { innerW: 0.593, innerH: 0.499, innerX: 0.036, innerY: -0.07, angle: -8.4 },
};

// album-book.png's two page areas as fractions of the book's own display
// size — measured off the source art (curved page edges, off-center spine).
const BOOK_KEY = "album_book";
const BOOK_PAGE_X_OFFSET = 0.237; // book-center → each page-center, fraction of bookW
const BOOK_PAGE_TOP_FRAC = 0.025; // book top edge → usable page top, fraction of bookH
const BOOK_PAGE_BOTTOM_FRAC = 0.943; // book top edge → usable page bottom, fraction of bookH

// Vertical scrollbar for the left-page thumbnail grid, drawn from a track
// pill (stretched to the page height — a plain capsule shape, so stretching
// it has no distortion artifact) and a draggable thumb sized to how much of
// the grid is visible.
const SCROLL_TRACK_KEY = "scroll_track";
const SCROLL_THUMB_KEY = "scroll_thumb";
const SCROLLBAR_W = 14;
const SCROLLBAR_THUMB_W = 8;
// Breathing room so the grid + scrollbar don't touch the page's curved top
// edge or the tab row at the bottom.
const GRID_PAGE_PAD_Y = 24;

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
    this.cameras.main.setBackgroundColor("#E8BF92");
    fadeScene(this, "in");

    this.confirm = new ConfirmDialog(this);
    this._leftItems = []; // left-page display objects, cleared on re-render
    this._rightItems = []; // right-page display objects, cleared on re-render
    this._scroll = null; // active field-notes scroll state, or null

    // Mouse-wheel scrolling for whichever (masked) side overflows — the left
    // page's thumbnail grid, or the right page's field notes.
    this.input.on("wheel", (p, _over, _dx, dy) => {
      if (p.x < this.bookX) this._scrollLeftBy(dy);
      else this._scrollBy(dy);
    });

    const head = this.add
      .text(W / 2, H * 0.08, t("album.title"), {
        fontFamily: FONTS.display,
        fontSize: "40px",
        letterSpacing: letterSpacing(40),
        color: THEME.ink,
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    popIn(head);

    // ---- book panel -----------------------------------------------------
    const maxBookW = Math.min(W * 0.9, 1150);
    const maxBookH = H * 0.77;
    const bookSize = this._containSize(BOOK_KEY, maxBookW, maxBookH);
    this.bookW = bookSize.w;
    this.bookH = bookSize.h;
    this.bookX = W / 2;
    this.bookY = H * 0.517;
    if (this.textures.exists(BOOK_KEY)) {
      this.add.image(this.bookX, this.bookY, BOOK_KEY).setDisplaySize(this.bookW, this.bookH);
    } else {
      this.add
        .rectangle(this.bookX, this.bookY, this.bookW, this.bookH, BOOK_FILL, 1)
        .setStrokeStyle(4, 0x9c855a, 1);
      // center "spine" divides the two pages
      this.add
        .rectangle(this.bookX, this.bookY, 3, this.bookH - 40, 0x9c855a, 0.5)
        .setOrigin(0.5);
    }

    // page centers + a shared inner top edge
    this.lpx = this.bookX - this.bookW * BOOK_PAGE_X_OFFSET;
    this.rpx = this.bookX + this.bookW * BOOK_PAGE_X_OFFSET;
    this.pageTop = this.bookY - this.bookH / 2 + this.bookH * BOOK_PAGE_TOP_FRAC;
    this.pageBottom = this.bookY - this.bookH / 2 + this.bookH * BOOK_PAGE_BOTTOM_FRAC;

    // ---- level tabs (placeholder for bookmark asset) ------------------------
    this._buildTabs();

    const back = makeButton(this, {
      x: W / 2,
      y: H - 40,
      w: 160,
      h: 46,
      label: t("btn.back"),
      color: THEME.settings,
      fontSize: 18,
      onClick: () =>
        fadeScene(this, "out", {
          onComplete: () => this.scene.start("MainMenuScene"),
        }),
    });
    back.label.setColor(THEME.ink);
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
          letterSpacing: letterSpacing(18),
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

  // Fits a texture's native aspect ratio inside a (maxW, maxH) box — never
  // stretches, so real art never comes out squashed. Falls back to the box
  // size itself when the texture isn't loaded (e.g. placeholder rects, which
  // have no native aspect to preserve).
  _containSize(texKey, maxW, maxH) {
    const src = this.textures.exists(texKey) && this.textures.get(texKey).getSourceImage();
    if (!src || !src.width || !src.height) return { w: maxW, h: maxH };
    const scale = Math.min(maxW / src.width, maxH / src.height);
    return { w: src.width * scale, h: src.height * scale };
  }

  // Fills a (targetW, targetH) box exactly with a texture, 1:1 to the box —
  // scales up to cover it and center-crops the overflow, so the photo never
  // stretches (no aspect distortion) and never leaves gaps inside the frame's
  // window (no letterboxing either).
  _coverFit(img, texKey, targetW, targetH) {
    const src = this.textures.get(texKey).getSourceImage();
    const scale = Math.max(targetW / src.width, targetH / src.height);
    const cropW = targetW / scale;
    const cropH = targetH / scale;
    img.setCrop((src.width - cropW) / 2, (src.height - cropH) / 2, cropW, cropH);
    img.setDisplaySize(targetW, targetH);
  }

  // Draws a photo-border frame centered at (cx, cy), fit within (maxW,
  // maxH), with the photo texture (or a placeholder rect) inset into the
  // frame's window — also aspect-fit, never stretched. Pass { active: true }
  // to use the tilted "picked up" frame instead of the default upright one —
  // selection is shown by swapping the frame art, not by drawing an extra
  // border on top. Returns { frame, photo } so callers can push both into
  // their item list.
  _framedPhoto(cx, cy, maxW, maxH, key, { active = false } = {}) {
    const frameKey = active ? ACTIVE_FRAME_KEY : FRAME_KEY;
    const cfg = FRAME_CONFIGS[frameKey];
    const { w, h } = this._containSize(frameKey, maxW, maxH);
    const frame = this.textures.exists(frameKey)
      ? this.add.image(cx, cy, frameKey).setDisplaySize(w, h)
      : this.add.rectangle(cx, cy, w, h, 0x000000, 0).setStrokeStyle(2, 0x9c855a, 0.8);
    frame.setOrigin(0.5);

    const innerCX = cx + w * cfg.innerX;
    const innerCY = cy + h * cfg.innerY;
    const innerMaxW = w * cfg.innerW;
    const innerMaxH = h * cfg.innerH;
    const hasPhoto = this.textures.exists(key);
    const photo = hasPhoto
      ? this.add.image(innerCX, innerCY, key)
      : this.add.rectangle(innerCX, innerCY, innerMaxW, innerMaxH, 0xd8c8a0, 1);
    photo.setOrigin(0.5).setAngle(cfg.angle);
    if (hasPhoto) this._coverFit(photo, key, innerMaxW, innerMaxH);

    return { frame, photo };
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
    this._leftScroll = null;

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
    const areaTop = this.pageTop + GRID_PAGE_PAD_Y;
    const areaBottom = this.pageBottom - GRID_PAGE_PAD_Y;
    const pageH = areaBottom - areaTop;
    const startX = this.lpx - gridW / 2 + TW / 2;
    const startY = areaTop + Math.max(0, (pageH - gridH) / 2) + TH / 2;

    // Thumbnails live in a container so overflow can be masked and the whole
    // grid scrolled by moving one object instead of every frame/photo pair.
    const content = this.add.container(0, 0);
    photos.forEach((p, i) => {
      const cx = startX + (i % COLS) * (TW + GAP_X);
      const cy = startY + Math.floor(i / COLS) * (TH + GAP_Y);
      const key = this._key(p.id);
      const selected = p.id === this._selectedId;

      const { frame, photo: img } = this._framedPhoto(cx, cy, TW, TH, key, { active: selected });
      frame.setInteractive({ useHandCursor: true });
      frame.on("pointerdown", () => this._select(p.id));
      content.add([frame, img]);

      popIn(frame, { delay: 40 + i * 25 });
    });
    this._leftItems.push(content);

    // Clip the grid to the page bounds so overflow scrolls instead of
    // spilling onto the spine or off the bottom edge.
    const maskW = gridW + 20;
    const g = this.make.graphics({ add: false });
    g.fillStyle(0xffffff);
    g.fillRect(this.lpx - maskW / 2, areaTop, maskW, pageH);
    content.setMask(g.createGeometryMask());
    this._leftItems.push(g);

    const max = Math.max(0, gridH - pageH);
    if (max <= 0) return; // fits — no scrollbar needed

    // Track + draggable thumb, tucked in the margin between the grid and the
    // spine, matching the grid's own top/bottom padding so it doesn't run
    // the full length of the page. Both are plain capsule art, so stretching
    // the track vertically is safe (no recognizable detail to distort).
    const trackX = this.lpx + gridW / 2 + 6;
    const track = this.add
      .image(trackX, areaTop, SCROLL_TRACK_KEY)
      .setOrigin(0.5, 0)
      .setDisplaySize(SCROLLBAR_W, pageH);
    this._leftItems.push(track);

    const thumbH = Math.max(30, (pageH * pageH) / gridH);
    const thumb = this.add
      .image(trackX, areaTop, SCROLL_THUMB_KEY)
      .setOrigin(0.5, 0)
      .setDisplaySize(SCROLLBAR_THUMB_W, thumbH)
      .setInteractive({ useHandCursor: true, draggable: true, cursor: "grab" });
    this._leftItems.push(thumb);

    this._leftScroll = { content, thumb, top: areaTop, regionH: pageH, max, thumbH, offset: 0, dragBase: 0, dragY: 0 };

    thumb.on("dragstart", (p) => {
      this._leftScroll.dragBase = this._leftScroll.offset;
      this._leftScroll.dragY = p.y;
    });
    thumb.on("drag", (p) => {
      const s = this._leftScroll;
      const range = s.regionH - s.thumbH;
      const deltaOffset = range > 0 ? ((p.y - s.dragY) / range) * s.max : 0;
      this._setLeftScroll(s.dragBase + deltaOffset);
    });
  }

  // Wheel handler target: scroll the thumbnail grid by a wheel delta.
  _scrollLeftBy(dy) {
    if (!this._leftScroll) return;
    this._setLeftScroll(this._leftScroll.offset + dy);
  }

  // Apply a clamped scroll offset to the grid content + scrollbar thumb.
  _setLeftScroll(next) {
    const s = this._leftScroll;
    s.offset = Phaser.Math.Clamp(next, 0, s.max);
    s.content.y = -s.offset;
    s.thumb.y = s.top + (s.offset / s.max) * (s.regionH - s.thumbH);
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
    const { frame, photo: img } = this._framedPhoto(this.rpx, py, photoW, photoH, key);
    this._rightItems.push(frame, img);

    // title
    const title = this.add
      .text(this.rpx, py + photoH / 2 + 14, info ? info.name : t("album.snapshot"), {
        fontFamily: FONTS.display,
        fontSize: "22px",
        letterSpacing: letterSpacing(22),
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
