// Callout — a full-screen dim overlay with a pulsing border pointing at a fixed
// HUD position, plus a short instruction bubble. Unlike DialogBox, this does NOT
// go through EVENTS.DIALOG_SHOW (CameraTool lowers the camera and blocks raising
// whenever that fires) — so it's safe to show while AIMING, e.g. to explain
// aiming/zoom/shoot mid-shot without kicking the player out of it.
//
// Target rects are hardcoded screen-space constants mirroring the real layout
// constants elsewhere in the HUD (kept in sync by hand if that layout changes):
//   confirm         -> ControlBar confirm button  (src/ui/ControlBar.js:24)
//   hint            -> camera hint text           (src/camera/CameraTool.js:106)
//   sidebarHandle   -> Sidebar closed-state handle (src/ui/Sidebar.js:63-66)
//   zoomIndicators  -> CameraTool zoom level chips (src/camera/CameraTool.js:119-138)
import Phaser from 'phaser';
import { EASE, DUR, popIn, popOut } from '../anim/motion.js';
import { FONTS } from '../config/fonts.js';
import { t } from '../core/i18n.js';

const BUBBLE_W = 360, BUBBLE_H = 92;

export function calloutTargets(W, H) {
  return {
    // fill mirrors ControlBar's confirm button color (src/ui/ControlBar.js:24)
    // so the highlight reads as "this button, brighter" rather than a generic box.
    confirm: { x: W / 2 - 120, y: H - 64 - 28, w: 240, h: 56, fill: 0x7bbf6a, fillAlpha: 0.35 },
    // No border: this spot has no fixed visible HUD element in IDLE (the ambient
    // camera hint text it mirrors only renders while AIMING) — a pulsing outline
    // there would point at empty space. The bubble alone still anchors up here.
    hint: { x: 10, y: 8, w: 260, h: 30, border: false },
    sidebarHandle: { x: W - 32, y: H / 2 - 32, w: 32, h: 64 },
    zoomIndicators: { x: W / 2 - 72, y: H - 34 - 13, w: 144, h: 26 },
  };
}

export class Callout {
  constructor(scene, depth = 1400) {
    this.scene = scene;
    this.depth = depth;
    this.visible = false;
    const W = scene.cameras.main.width, H = scene.cameras.main.height;
    this.targets = calloutTargets(W, H);

    // Single full-screen dim — no spotlight cutout, the whole overlay stays dark
    // except the border outline (stroke only, no fill) and the bubble panel.
    this.dim = scene.add.rectangle(0, 0, W, H, 0x000000, 0).setOrigin(0, 0).setDepth(depth);

    this.border = scene.add.rectangle(0, 0, 10, 10, 0x000000, 0).setOrigin(0.5)
      .setStrokeStyle(4, 0xffd75e, 1).setDepth(depth + 1).setVisible(false);

    this.bubble = scene.add.container(W / 2, H / 2).setDepth(depth + 1).setVisible(false);
    const bg = scene.add.rectangle(0, 0, BUBBLE_W, BUBBLE_H, 0x2b2230, 0.96).setOrigin(0.5).setStrokeStyle(3, 0xffe08a, 0.8);
    this.body = scene.add.text(0, -10, '', {
      fontFamily: FONTS.body, fontSize: '18px', color: '#ffffff',
      align: 'center', wordWrap: { width: BUBBLE_W - 40 }, lineSpacing: 4,
    }).setOrigin(0.5);
    this.footer = scene.add.text(0, BUBBLE_H / 2 - 16, t('tutorial.callouthint'), {
      fontFamily: FONTS.body, fontSize: '13px', color: '#bbbbbb',
    }).setOrigin(0.5);
    this.bubble.add([bg, this.body, this.footer]);
  }

  // key: one of calloutTargets() keys, or null for a centered bubble with no
  // pointer (steps that don't need pixel-perfect pointing).
  show(key, text) {
    this.visible = true;
    // A step change calls hide() then show() back-to-back in the same tick —
    // kill any in-flight fade-out tween first so its delayed onComplete can't
    // stomp the fade-in this call is about to start (see hide()'s guard too).
    this.scene.tweens.killTweensOf(this.bubble);
    this.scene.tweens.killTweensOf(this.dim);
    const rect = key ? this.targets[key] : null;
    this.body.setText(text || '');

    if (rect) {
      if (rect.border !== false) {
        this._positionBorder(rect);
        this.border.setFillStyle(rect.fill ?? 0x000000, rect.fillAlpha ?? 0);
        this.border.setVisible(true);
        this._pulse();
      } else {
        if (this._pulseTween) { this._pulseTween.stop(); this._pulseTween = null; }
        this.border.setVisible(false);
      }
      this.bubble.setPosition(this._bubbleX(rect), this._bubbleY(rect));
    } else {
      this.border.setVisible(false);
      const W = this.scene.cameras.main.width, H = this.scene.cameras.main.height;
      this.bubble.setPosition(W / 2, H / 2);
    }

    this.bubble.setVisible(true);
    this.scene.tweens.add({ targets: this.dim, fillAlpha: 0.6, ease: EASE.out, duration: DUR.base });
    popIn(this.bubble);
  }

  hide() {
    if (!this.visible) return;
    this.visible = false;
    if (this._pulseTween) { this._pulseTween.stop(); this._pulseTween = null; }
    this.scene.tweens.add({ targets: this.dim, fillAlpha: 0, ease: EASE.in, duration: DUR.quick });
    this.border.setVisible(false);
    // Guard against a show() firing before this tween completes (see show()) —
    // only actually hide if we're still the most recent call by then.
    popOut(this.bubble, { onComplete: () => { if (!this.visible) this.bubble.setVisible(false); } });
  }

  destroy() {
    if (this._pulseTween) this._pulseTween.stop();
    [this.dim, this.border, this.bubble].forEach((o) => o.destroy());
  }

  _positionBorder(r) {
    this.border.setPosition(r.x + r.w / 2, r.y + r.h / 2);
    this.border.setSize(r.w, r.h);
  }

  _pulse() {
    if (this._pulseTween) this._pulseTween.stop();
    this.border.setAlpha(1);
    this._pulseTween = this.scene.tweens.add({
      targets: this.border, alpha: 0.75, ease: EASE.inOut, duration: DUR.idleBob, yoyo: true, repeat: -1,
    });
  }

  // Bubble sits below the target unless that would run off the bottom, then above.
  _bubbleX(r) {
    const W = this.scene.cameras.main.width;
    return Phaser.Math.Clamp(r.x + r.w / 2, BUBBLE_W / 2 + 12, W - BUBBLE_W / 2 - 12);
  }
  _bubbleY(r) {
    const H = this.scene.cameras.main.height;
    const below = r.y + r.h + BUBBLE_H / 2 + 20;
    return below + BUBBLE_H / 2 <= H - 10 ? below : r.y - BUBBLE_H / 2 - 20;
  }
}

export default Callout;
