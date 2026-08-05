// Small reusable feedback functions: shutter flash, click sound, miss/success cues.
// All motion driven through transform props via src/anim/motion.js presets.
import { shutterFlash, missPulse, EASE, DUR } from '../anim/motion.js';

// White flash sized to the frame. EXAGGERATION: flash slightly larger than frame.
export function playFlash(scene, frameBounds, onComplete) {
  const flash = scene.add.rectangle(
    frameBounds.x + frameBounds.w / 2,
    frameBounds.y + frameBounds.h / 2,
    frameBounds.w, frameBounds.h, 0xffffff, 1
  ).setOrigin(0.5, 0.5).setDepth(900);
  shutterFlash(flash, { onComplete: () => { flash.destroy(); onComplete && onComplete(); } });
}

// Gentle miss cue on the reticle. No penalty, no harsh shake (APPEAL).
export function playMiss(scene, reticle) {
  missPulse(reticle);
}

// Soft success pulse on the vignette (SECONDARY ACTION).
export function pulseVignette(scene, vignetteParts) {
  vignetteParts.forEach((p) => {
    const a = p.alpha;
    scene.tweens.add({
      targets: p, alpha: Math.min(1, a + 0.12),
      ease: EASE.inOut, duration: DUR.quick, yoyo: true,
    });
  });
}

export default { playFlash, playMiss, pulseVignette };
