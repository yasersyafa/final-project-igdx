// ShotBadge — cozy per-shot feedback. On a successful mission shot the domain
// emits SHOT_RATED; we pop an encouraging label (Good / Great / Perfect) over
// the viewfinder. Lives in the camera system so it renders ABOVE the letterbox
// overlay while aiming (the HUD is hidden then). Never shown for misses.
import { EVENTS } from '../config/events.js';
import { checkPop, EASE, DUR } from '../anim/motion.js';
import { FONTS } from '../config/fonts.js';

const DEPTH = 950; // above shutter flash (900) and overlay

export function initShotBadge(scene, bus) {
  let current = null;

  const clear = () => { if (current) { current.destroy(); current = null; } };

  const onRated = (tier) => {
    if (!tier) return;
    clear(); // one badge at a time — a fast burst of shots shouldn't stack

    const cx = scene.cameras.main.width / 2;
    const cy = scene.cameras.main.height * 0.32;
    const badge = scene.add.text(cx, cy, tier.label, {
      fontFamily: FONTS.display, fontSize: '44px',
      color: tier.color, fontStyle: 'bold',
      stroke: '#20242f', strokeThickness: 6,
    }).setOrigin(0.5).setDepth(DEPTH);
    current = badge;

    // Pop in with overshoot, then float up and fade out, then destroy.
    checkPop(badge);
    scene.tweens.add({
      targets: badge,
      y: cy - 40,
      alpha: 0,
      ease: EASE.quadOut,
      duration: DUR.base,
      delay: 520,
      onComplete: () => { if (current === badge) current = null; badge.destroy(); },
    });
  };

  bus.on(EVENTS.SHOT_RATED, onRated);
  scene.events.once('shutdown', () => {
    bus.off(EVENTS.SHOT_RATED, onRated);
    clear();
  });
}

export default initShotBadge;
