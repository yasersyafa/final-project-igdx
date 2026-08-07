// PhotoStrip — the "film roll". Each shot's real snapshot flies in here with an
// instant-film "develop" animation. Capped at CONFIG.MAX_PHOTOS; the roll is shown
// in full (no silent eviction). While the camera is lowered, hovering a thumbnail
// reveals an ✕ — clicking it opens a confirm dialog to delete the photo, freeing a slot.
import Phaser from 'phaser';
import { EVENTS } from '../config/events.js';
import { CONFIG } from '../config/gameConfig.js';
import { EASE, DUR, checkPop } from '../anim/motion.js';
import { ConfirmDialog } from './ConfirmDialog.js';
import { DEBUG } from '../config/debug.js';
import { FONTS } from '../config/fonts.js';
import { t } from '../core/i18n.js';

const MAX = CONFIG.MAX_PHOTOS;
const TW = 90, TH = 68;              // photo size (4:3-ish)
const BW = TW + 8, BH = TH + 16;     // film border size
const PHOTO_DY = -6;                 // photo image y-offset within the card
const XB_R = 12;                     // ✕ button radius
const XB_DX = BW / 2 - 6, XB_DY = -BH / 2 + 6; // ✕ position (card top-right)
const DASH = 6, GAP = 4; // placeholder dashed-border rhythm

// Dashes one straight segment (local coords) at the current lineStyle.
function dashSegment(g, x1, y1, x2, y2) {
  const len = Math.hypot(x2 - x1, y2 - y1);
  if (len <= 0) return;
  const dx = (x2 - x1) / len, dy = (y2 - y1) / len;
  for (let pos = 0; pos < len; pos += DASH + GAP) {
    const end = Math.min(pos + DASH, len);
    g.lineBetween(x1 + dx * pos, y1 + dy * pos, x1 + dx * end, y1 + dy * end);
  }
}

// An empty-slot placeholder: a dashed rectangle outline, centered on its own
// position like the photo cards, so it drops straight into a grid slot.
function makeDashedPlaceholder(scene, w, h, depth) {
  const g = scene.add.graphics().setDepth(depth);
  g.lineStyle(2, 0xfff5e6, 0.3);
  const hw = w / 2, hh = h / 2;
  dashSegment(g, -hw, -hh, hw, -hh);
  dashSegment(g, hw, -hh, hw, hh);
  dashSegment(g, hw, hh, -hw, hh);
  dashSegment(g, -hw, hh, -hw, -hh);
  return g;
}

export class PhotoStrip {
  // opts: { layer, originX, top, step, headerGap, cols, colGap, flyStart } —
  // originX/top/step are LOCAL coordinates (relative to `layer`, e.g. a sidebar
  // panel origin). With cols > 1, slots fill left-to-right then wrap to the next
  // row (`step` becomes the row height); originX is the grid's horizontal center.
  // headerGap is the vertical offset from the first row's center up to the header
  // (must clear the slot's half-height, or the header sits under the first card).
  // flyStart() is called per-photo to get the local start point for the "develop"
  // fly-in, since the visual screen-center may not map to a fixed local point when
  // the layer slides.
  constructor(scene, bus, levelData, depth = 1000, opts = {}) {
    this.scene = scene;
    this.bus = bus;
    this.depth = depth;
    this.items = [];       // { c, id, key, xBtn } newest last
    this.enabled = false;  // delete interactions only while camera lowered (IDLE)
    this.confirm = new ConfirmDialog(scene);

    const {
      layer = null, originX = 1280 - 60, top = 140, step = 80, headerGap = 32,
      cols = 1, colGap = 10, flyStart = () => ({ x: 640, y: 360 }),
    } = opts;
    this.originX = originX;
    this.slotTop = top;
    this.slotStep = step;
    this.cols = cols;
    this.colGap = colGap;
    this.flyStart = flyStart;

    this.header = scene.add.text(this.originX, this.slotTop - headerGap, t('hud.roll', { n: 0, max: MAX }), {
      fontFamily: FONTS.body, fontSize: '16px', color: '#fff5e6', fontStyle: 'bold',
    }).setOrigin(0.5, 0.5).setDepth(depth);
    if (layer) layer.add(this.header);
    this.layer = layer;

    // Empty-slot placeholders for all MAX slots, drawn once. Photos land on top
    // of them slot-by-slot (later-added = higher z), so a placeholder is only
    // ever visible where no photo currently sits — no manual show/hide needed.
    for (let i = 0; i < MAX; i++) {
      const { x, y } = this._slotPos(i);
      const ph = makeDashedPlaceholder(scene, BW, BH, depth).setPosition(x, y);
      if (layer) layer.add(ph);
    }

    this._onPhoto = (p) => this.addPhoto(p);
    this._onRaised = () => { this.enabled = false; this.items.forEach((it) => it.xBtn.setVisible(false)); };
    this._onLowered = () => { this.enabled = true; };
    bus.on(EVENTS.PHOTO_TAKEN, this._onPhoto);
    bus.on(EVENTS.CAMERA_RAISED, this._onRaised);
    bus.on(EVENTS.CAMERA_LOWERED, this._onLowered);
    scene.events.once('shutdown', () => {
      bus.off(EVENTS.PHOTO_TAKEN, this._onPhoto);
      bus.off(EVENTS.CAMERA_RAISED, this._onRaised);
      bus.off(EVENTS.CAMERA_LOWERED, this._onLowered);
    });
  }

  addPhoto({ id, thumbKey }) {
    const s = this.scene;
    // Container starts big at the fly-in point, then flies to its slot and shrinks.
    const start = this.flyStart();
    const c = s.add.container(start.x, start.y).setDepth(this.depth);
    const border = s.add.rectangle(0, 0, BW, BH, 0xf7f3ea, 1).setOrigin(0.5).setStrokeStyle(2, 0x000000, 0.15);
    let photo;
    if (thumbKey && s.textures.exists(thumbKey)) {
      photo = s.add.image(0, PHOTO_DY, thumbKey).setDisplaySize(TW, TH).setOrigin(0.5);
    } else {
      photo = s.add.rectangle(0, PHOTO_DY, TW, TH, 0x444a55, 1).setOrigin(0.5);
    }
    // ✕ delete button — a REAL interactive child, so its collider == the drawn circle.
    const xBtn = s.add.container(XB_DX, XB_DY).setVisible(false);
    const xbg = s.add.circle(0, 0, XB_R, 0xc0504a, 1).setStrokeStyle(2, 0xffffff, 0.9);
    const xtx = s.add.text(0, -1, '✕', { fontFamily: FONTS.body, fontSize: '14px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
    xBtn.add([xbg, xtx]);

    c.add([border, photo, xBtn]);
    c.setScale(2.4).setAlpha(0.0); // start large, undeveloped
    if (this.layer) this.layer.add(c);

    const item = { c, id, key: thumbKey, xBtn };
    this.items.push(item);

    // Card hover area == the visible photo (not the padded film card).
    c.setInteractive(new Phaser.Geom.Rectangle(-TW / 2, PHOTO_DY - TH / 2, TW, TH), Phaser.Geom.Rectangle.Contains);
    c.on('pointerover', () => this._showX(item));
    c.on('pointerout', () => this._hideX(item));

    // The ✕ is its own button: exact circular collider, own hover, own click.
    xBtn.setInteractive(new Phaser.Geom.Circle(0, 0, XB_R), Phaser.Geom.Circle.Contains);
    xBtn.on('pointerover', () => this._showX(item));
    xBtn.on('pointerout', () => this._hideX(item));
    xBtn.on('pointerdown', (p, lx, ly, e) => {
      if (e && e.stopPropagation) e.stopPropagation();
      if (!this.enabled) return;
      this.confirm.open({ message: t('confirm.deletephoto'), onConfirm: () => this._deleteItem(item) });
    });

    if (DEBUG.hitboxes) {
      s.input.enableDebug(c, 0x00ffff);    // cyan = photo hover area
      s.input.enableDebug(xBtn, 0xff00ff); // magenta = ✕ delete hit area
    }

    this._relayout(c);
    this._updateHeader();
  }

  _showX(item) {
    if (!this.enabled) return;
    item.xBtn.setVisible(true);
    if (!item._xPopped) { item._xPopped = true; checkPop(item.xBtn); } // pop once, no boundary flicker
  }

  _hideX(item) { item.xBtn.setVisible(false); }

  _deleteItem(item) {
    const s = this.scene;
    const idx = this.items.indexOf(item);
    if (idx === -1) return;
    this.items.splice(idx, 1);
    this.bus.emit(EVENTS.PHOTO_DELETED, { id: item.id }); // domain drops it + reconciles ticks
    item.c.disableInteractive();
    s.tweens.add({
      targets: item.c, alpha: 0, scaleX: 0.6, scaleY: 0.6, ease: EASE.in, duration: DUR.quick,
      onComplete: () => { item.c.destroy(); if (item.key && s.textures.exists(item.key)) s.textures.remove(item.key); },
    });
    this._relayout(null);
    this._updateHeader();
  }

  _updateHeader() {
    const n = this.items.length;
    this.header.setText(t('hud.roll', { n, max: MAX }));
    this.header.setColor(n >= MAX ? '#ffcaca' : '#fff5e6');
  }

  // Slot i's grid position: fills left-to-right, wraps to the next row.
  _slotPos(i) {
    const col = i % this.cols;
    const row = Math.floor(i / this.cols);
    const colOffset = (col - (this.cols - 1) / 2) * (BW + this.colGap);
    return { x: this.originX + colOffset, y: this.slotTop + row * this.slotStep };
  }

  // Fly the newest into its slot; settle existing into theirs.
  _relayout(newest) {
    const s = this.scene;
    this.items.forEach((it, i) => {
      const { x, y } = this._slotPos(i);
      if (it.c === newest) {
        // SLOW-IN/OUT travel + "develop": fade up and shrink to slot with overshoot.
        s.tweens.add({ targets: it.c, x, y, ease: EASE.cubicOut, duration: DUR.base });
        s.tweens.add({ targets: it.c, scaleX: 1, scaleY: 1, alpha: 1, ease: EASE.backOut, duration: DUR.base });
      } else {
        s.tweens.add({ targets: it.c, x, y, ease: EASE.inOut, duration: DUR.quick });
      }
    });
  }
}

export default PhotoStrip;
