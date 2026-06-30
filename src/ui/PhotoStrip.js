// PhotoStrip — right-side "film roll". Each shot's real snapshot flies in here
// with an instant-film "develop" animation. Stays visible during AIMING (it is the
// camera's roll), so the player sees results pile up as they shoot.
import { EVENTS } from '../config/events.js';
import { EASE, DUR, popIn } from '../anim/motion.js';

const MAX = 5;
const TW = 132, TH = 99;      // thumbnail size (4:3)
const SLOT_X = 1280 - 84;     // right rail center x
const SLOT_TOP = 150, SLOT_STEP = TH + 18;

export class PhotoStrip {
  constructor(scene, bus, levelData, depth = 1000) {
    this.scene = scene;
    this.bus = bus;
    this.depth = depth;
    this.items = []; // {container} newest last

    this.header = scene.add.text(SLOT_X, 112, 'Roll  0', {
      fontFamily: 'system-ui, sans-serif', fontSize: '16px', color: '#fff5e6', fontStyle: 'bold',
    }).setOrigin(0.5, 0.5).setDepth(depth);

    this._onPhoto = (p) => this.addPhoto(p);
    bus.on(EVENTS.PHOTO_TAKEN, this._onPhoto);
    scene.events.once('shutdown', () => bus.off(EVENTS.PHOTO_TAKEN, this._onPhoto));
  }

  addPhoto({ thumbKey }) {
    const s = this.scene;
    // Container starts big at the frame center, then flies to its slot and shrinks.
    const c = s.add.container(640, 360).setDepth(this.depth);
    const border = s.add.rectangle(0, 0, TW + 10, TH + 22, 0xf7f3ea, 1).setOrigin(0.5).setStrokeStyle(2, 0x000000, 0.15);
    let photo;
    if (thumbKey && s.textures.exists(thumbKey)) {
      photo = s.add.image(0, -6, thumbKey).setDisplaySize(TW, TH).setOrigin(0.5);
    } else {
      photo = s.add.rectangle(0, -6, TW, TH, 0x444a55, 1).setOrigin(0.5);
    }
    c.add([border, photo]);
    c.setScale(2.4).setAlpha(0.0); // start large, undeveloped

    this.items.push({ c, key: thumbKey });
    if (this.items.length > MAX) {
      const old = this.items.shift();
      s.tweens.add({ targets: old.c, alpha: 0, scaleX: 0.6, scaleY: 0.6, ease: EASE.in, duration: DUR.quick,
        onComplete: () => { old.c.destroy(); if (old.key && s.textures.exists(old.key)) s.textures.remove(old.key); } });
    }
    this._relayout(c);
    this.header.setText(`Roll  ${this.header._count = (this.header._count || 0) + 1}`);
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
