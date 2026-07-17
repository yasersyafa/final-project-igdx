// GalleryScene — views the saved photos for one level as a thumbnail grid.
// Reached from the LevelSelect popup's Gallery button. Photos are stored as
// JPEG data URLs (see core/gallery.js); each is loaded into a texture and shown.
// Tap a photo's ✕ to delete it (ConfirmDialog); Back returns to LevelSelect.
import Phaser from "phaser";
import { LEVELS } from "./levels.js";
import { photosFor, removePhoto } from "../core/gallery.js";
import { popIn, fadeScene } from "../anim/motion.js";
import { makeButton } from "../ui/Button.js";
import { ConfirmDialog } from "../ui/ConfirmDialog.js";
import { FONTS } from "../config/fonts.js";

const COLS = 4;
const TW = 200,
  TH = 150; // thumbnail size (4:3, matches the snapshot strip)
const GAP_X = 40,
  GAP_Y = 48;

export class GalleryScene extends Phaser.Scene {
  constructor() {
    super("GalleryScene");
  }

  init(data) {
    this.levelIndex = data.levelIndex ?? 0;
    const lv = LEVELS[this.levelIndex];
    this.levelId = lv.id;
    this.levelName = lv.name;
  }

  create() {
    const { width: W, height: H } = this.cameras.main;
    this.cameras.main.setBackgroundColor("#20242f");
    fadeScene(this, "in");

    const head = this.add
      .text(W / 2, H * 0.12, `${this.levelName} Gallery`, {
        fontFamily: FONTS.display,
        fontSize: "38px",
        color: "#fff5e6",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    popIn(head);

    this.confirm = new ConfirmDialog(this);
    this._items = []; // display objects for the current grid, cleared on re-render

    const back = makeButton(this, {
      x: W / 2,
      y: H - 56,
      w: 160,
      h: 50,
      label: "← Back",
      color: 0x3a4353,
      fontSize: 18,
      onClick: () =>
        fadeScene(this, "out", {
          onComplete: () => this.scene.start("LevelSelectScene"),
        }),
    });
    popIn(back, { delay: 300 });

    this._loadAndRender();
  }

  // Load any not-yet-loaded photo textures, then draw the grid.
  _loadAndRender() {
    const photos = photosFor(this.levelId);
    const pending = photos.filter(
      (p) => !this.textures.exists(this._key(p.id)),
    );
    if (pending.length === 0) {
      this._renderGrid(photos);
      return;
    }
    pending.forEach((p) => this.load.image(this._key(p.id), p.dataUrl));
    this.load.once("complete", () => this._renderGrid(photos));
    this.load.start();
  }

  _key(id) {
    return `gal_${id}`;
  }

  _renderGrid(photos) {
    this._items.forEach((o) => o.destroy());
    this._items = [];

    const { width: W, height: H } = this.cameras.main;
    if (photos.length === 0) {
      const empty = this.add
        .text(W / 2, H / 2, "No photos yet.", {
          fontFamily: FONTS.body,
          fontSize: "22px",
          color: "#6b6459",
        })
        .setOrigin(0.5);
      this._items.push(empty);
      return;
    }

    const rows = Math.ceil(photos.length / COLS);
    const gridW = COLS * TW + (COLS - 1) * GAP_X;
    const gridH = rows * TH + (rows - 1) * GAP_Y;
    const startX = W / 2 - gridW / 2 + TW / 2;
    const startY = Math.max(H * 0.24, H / 2 - gridH / 2) + TH / 2;

    photos.forEach((p, i) => {
      const cx = startX + (i % COLS) * (TW + GAP_X);
      const cy = startY + Math.floor(i / COLS) * (TH + GAP_Y);
      const key = this._key(p.id);

      const img = this.textures.exists(key)
        ? this.add.image(cx, cy, key).setDisplaySize(TW, TH)
        : this.add.rectangle(cx, cy, TW, TH, 0x444a55, 1);
      img.setOrigin(0.5);
      const border = this.add
        .rectangle(cx, cy, TW, TH, 0x000000, 0)
        .setOrigin(0.5)
        .setStrokeStyle(2, 0xffffff, 0.35);

      const del = makeButton(this, {
        x: cx + TW / 2 - 4,
        y: cy - TH / 2 + 4,
        w: 28,
        h: 28,
        label: "✕",
        color: 0xc06060,
        fontSize: 16,
        onClick: () => this._askDelete(p.id),
      });

      this._items.push(img, border, del);
      popIn(img, { delay: 60 + i * 40 });
    });
  }

  _askDelete(id) {
    this.confirm.open({
      message: "Delete this photo?",
      onConfirm: () => {
        removePhoto(this.levelId, id);
        const key = this._key(id);
        if (this.textures.exists(key)) this.textures.remove(key);
        this._renderGrid(photosFor(this.levelId));
      },
    });
  }
}

export default GalleryScene;
