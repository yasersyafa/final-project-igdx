// PhotoStrip — right-side "film roll". Each shot's real snapshot flies in here with
// an instant-film "develop" animation. Capped at CONFIG.MAX_PHOTOS; the roll is shown
// in full (no silent eviction). While the camera is lowered, hovering a thumbnail
// reveals an ✕ — clicking it opens a confirm dialog to delete the photo, freeing a slot.
import Phaser from 'phaser';
import { EVENTS } from '../config/events.js';
import { CONFIG } from '../config/gameConfig.js';
import { EASE, DUR } from '../anim/motion.js';
import { ConfirmDialog } from './ConfirmDialog.js';

const MAX = CONFIG.MAX_PHOTOS;
const TW = 80, TH = 60;              // photo size (4:3)
const BW = TW + 8, BH = TH + 16;     // film border size
const SLOT_X = 1280 - 60;            // right rail center x
const SLOT_TOP = 140, SLOT_STEP = 80;
const XB_DX = BW / 2 - 6, XB_DY = -BH / 2 + 6, XB_HIT = 16; // ✕ hotspot (world offset from center)

export class PhotoStrip {
  constructor(scene, bus, levelData, depth = 1000) {
    this.scene = scene;
    this.bus = bus;
    this.depth = depth;
    this.items = [];       // { c, id, key, xBtn } newest last
    this.enabled = false;  // delete interactions only while camera lowered (IDLE)
    this.confirm = new ConfirmDialog(scene);

    this.header = scene.add.text(SLOT_X, 108, `Roll  0 / ${MAX}`, {
      fontFamily: 'system-ui, sans-serif', fontSize: '16px', color: '#fff5e6', fontStyle: 'bold',
    }).setOrigin(0.5, 0.5).setDepth(depth);

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
    // Container starts big at the frame center, then flies to its slot and shrinks.
    const c = s.add.container(640, 360).setDepth(this.depth);
    const border = s.add.rectangle(0, 0, BW, BH, 0xf7f3ea, 1).setOrigin(0.5).setStrokeStyle(2, 0x000000, 0.15);
    let photo;
    if (thumbKey && s.textures.exists(thumbKey)) {
      photo = s.add.image(0, -6, thumbKey).setDisplaySize(TW, TH).setOrigin(0.5);
    } else {
      photo = s.add.rectangle(0, -6, TW, TH, 0x444a55, 1).setOrigin(0.5);
    }
    // ✕ delete affordance (visual only; click handled on the container to avoid input conflicts).
    const xBtn = s.add.container(XB_DX, XB_DY).setVisible(false);
    const xbg = s.add.circle(0, 0, 12, 0xc0504a, 1).setStrokeStyle(2, 0xffffff, 0.9);
    const xtx = s.add.text(0, -1, '✕', { fontFamily: 'system-ui, sans-serif', fontSize: '14px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
    xBtn.add([xbg, xtx]);

    c.add([border, photo, xBtn]);
    c.setScale(2.4).setAlpha(0.0); // start large, undeveloped

    const item = { c, id, key: thumbKey, xBtn };
    this.items.push(item);

    c.setSize(BW, BH).setInteractive(new Phaser.Geom.Rectangle(-BW / 2, -BH / 2, BW, BH), Phaser.Geom.Rectangle.Contains);
    c.on('pointerover', () => { if (this.enabled) xBtn.setVisible(true); });
    c.on('pointerout', () => xBtn.setVisible(false));
    c.on('pointerdown', (pointer) => {
      if (!this.enabled) return; // aiming-clicks shoot; deletes only when lowered
      const dx = pointer.x - (c.x + XB_DX);
      const dy = pointer.y - (c.y + XB_DY);
      if (dx * dx + dy * dy <= XB_HIT * XB_HIT) {
        this.confirm.open({ message: 'Delete this photo?', onConfirm: () => this._deleteItem(item) });
      }
    });

    this._relayout(c);
    this._updateHeader();
  }

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
    this.header.setText(`Roll  ${n} / ${MAX}`);
    this.header.setColor(n >= MAX ? '#ffcaca' : '#fff5e6');
  }

  // Fly the newest into its slot; settle existing into theirs.
  _relayout(newest) {
    const s = this.scene;
    this.items.forEach((it, i) => {
      const y = SLOT_TOP + i * SLOT_STEP;
      if (it.c === newest) {
        // SLOW-IN/OUT travel + "develop": fade up and shrink to slot with overshoot.
        s.tweens.add({ targets: it.c, x: SLOT_X, y, ease: EASE.cubicOut, duration: DUR.base });
        s.tweens.add({ targets: it.c, scaleX: 1, scaleY: 1, alpha: 1, ease: EASE.backOut, duration: DUR.base });
      } else {
        s.tweens.add({ targets: it.c, x: SLOT_X, y, ease: EASE.inOut, duration: DUR.quick });
      }
    });
  }
}

export default PhotoStrip;
