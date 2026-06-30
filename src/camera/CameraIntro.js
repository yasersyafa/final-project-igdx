// CameraIntro — a short "settling in" beat before control is handed over (~0.8s).
// Principles: ANTICIPATION (tiny scale dip), FOLLOW-THROUGH (Back.easeOut settle),
// STAGING (world eases to rest). Emits CAMERA_READY on complete -> camera goes IDLE.
import { EVENTS } from '../config/events.js';
import { EASE, DUR } from '../anim/motion.js';

export function playCameraIntro(scene, bus, world) {
  // Start a touch zoomed-out, breathe in to 1.0 with a gentle overshoot.
  world.setScale(0.96);
  scene.tweens.chain({
    targets: world,
    tweens: [
      { scaleX: 0.94, scaleY: 0.94, ease: EASE.in, duration: DUR.intro * 0.2 },   // ANTICIPATION
      { scaleX: 1, scaleY: 1, ease: EASE.backOut, duration: DUR.intro * 0.8 },     // FOLLOW-THROUGH
    ],
    onComplete: () => bus.emit(EVENTS.CAMERA_READY),
  });
}

export default playCameraIntro;
