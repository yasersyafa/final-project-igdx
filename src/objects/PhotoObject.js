// PhotoObject — placeholder-shape renderer for a level object.
// Thin Phaser wrapper. Origin (0.5,0.5) so swapping in a same-bounds sprite needs
// no motion edits. Idle motion + capture highlight come from src/anim/motion.js.
import Phaser from 'phaser';
import { idleByName, checkPop, EASE, DUR } from '../anim/motion.js';

// Stable color per id so placeholder shapes are distinguishable.
function hashColor(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return Phaser.Display.Color.HSLToColor(hue / 360, 0.45, 0.6).color;
}

export class PhotoObject extends Phaser.GameObjects.Container {
  constructor(scene, data) {
    super(scene, data.x, data.y);
    this.id = data.id;
    this.bbox = data.bbox;
    this.data_ = data;

    const w = data.bbox.w;
    const h = data.bbox.h;

    // SECONDARY ACTION target: soft shadow ellipse under the object.
    this.shadow = scene.add.ellipse(0, h * 0.5, w * 0.8, h * 0.22, 0x000000, 0.25);
    this.shadow.setOrigin(0.5, 0.5);

    // Placeholder body — a rounded rect. Origin centered.
    this.body_ = scene.add.rectangle(0, 0, w, h, hashColor(data.id));
    this.body_.setOrigin(0.5, 0.5);
    this.body_.setStrokeStyle(2, 0xffffff, 0.35);

    this.label = scene.add.text(0, 0, data.name, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '14px',
      color: '#ffffff',
      align: 'center',
      wordWrap: { width: w - 8 },
    }).setOrigin(0.5, 0.5);

    if (data.isSpecial) {
      this.body_.setStrokeStyle(3, 0xffe08a, 0.9); // gentle highlight for the special one
    }

    // Decor props: ambient scenery, not a target. Recede so they read as background.
    if (data.decor) {
      this.setAlpha(0.88);
      this.label.setColor('#e8e2d6').setAlpha(0.6);
    }

    this.add([this.shadow, this.body_, this.label]);
    scene.add.existing(this);

    this.captured = false;
    this._startIdle();
  }

  _startIdle() {
    // level data "idleAnim" maps to a preset name: bob | breathe | sway
    if (this.data_.idleAnim) {
      idleByName(this.data_.idleAnim, this.body_, { shadow: this.shadow });
    }
  }

  // STAGING + EXAGGERATION + FOLLOW-THROUGH: pop above siblings, brighten, settle.
  flashHighlight() {
    if (this.captured) return;
    this.captured = true;
    const prevDepth = this.depth;
    this.setDepth(1000); // STAGING: briefly above siblings
    this.body_.setStrokeStyle(4, 0xfff3c4, 1);
    checkPop(this.body_, {
      onComplete: () => {
        this.scene.tweens.add({
          targets: this.body_, scaleX: 1, scaleY: 1,
          ease: EASE.inOut, duration: DUR.quick,
        });
        this.setDepth(prevDepth);
      },
    });
  }
}

export default PhotoObject;
