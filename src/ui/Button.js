// makeButton — shared button. The collider is a centered rectangle exactly the size
// of the visible bg rect, and the button NEVER changes size (no hover/press scaling),
// so the clickable area always matches the rectangle. Hover/press feedback is a
// same-size white highlight overlay (alpha only), which cannot affect the collider.
import Phaser from 'phaser';
import { EASE, DUR } from '../anim/motion.js';
import { DEBUG } from '../config/debug.js';

export function makeButton(scene, opts) {
  const {
    x, y, w = 220, h = 56, label = '', color = 0x4a5a7a,
    fontSize = 22, onClick, depth = 1000, stopPropagation = false,
  } = opts;

  const c = scene.add.container(x, y).setDepth(depth);
  const bg = scene.add.rectangle(0, 0, w, h, color, 1).setOrigin(0.5).setStrokeStyle(2, 0xffffff, 0.5);
  const hi = scene.add.rectangle(0, 0, w, h, 0xffffff, 1).setOrigin(0.5).setAlpha(0); // highlight overlay
  const txt = scene.add.text(0, 0, label, {
    fontFamily: 'system-ui, sans-serif', fontSize: `${fontSize}px`, color: '#ffffff',
    align: 'center', wordWrap: { width: w - 16 },
  }).setOrigin(0.5);
  c.add([bg, hi, txt]);

  // Fixed collider == the visible rect. Centered, never scaled.
  // NOTE: do NOT call setSize on the container — it sets displayOrigin (w/2,h/2),
  // which pointWithinHitArea adds to the local point and double-offsets the hit area.
  c.setInteractive(new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h), Phaser.Geom.Rectangle.Contains);
  if (DEBUG.hitboxes) scene.input.enableDebug(c, 0x00ff00); // green outline = button hit area

  const fade = (target) => scene.tweens.add({ targets: hi, alpha: target, ease: EASE.out, duration: DUR.press });
  c.on('pointerover', () => fade(0.14));
  c.on('pointerout', () => fade(0));
  c.on('pointerdown', (p, lx, ly, e) => {
    if (stopPropagation && e && e.stopPropagation) e.stopPropagation();
    scene.tweens.add({ targets: hi, alpha: 0.32, ease: EASE.out, duration: DUR.press, yoyo: true,
      onComplete: () => { hi.setAlpha(0); if (onClick) onClick(); } });
  });

  c.label = txt;
  return c;
}

export default makeButton;
