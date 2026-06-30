// motion.js — reusable tween-preset library encoding the 12 principles of animation.
//
// ASSET-SWAP HARD RULE: all motion drives transform props only
// (x, y, scaleX, scaleY, angle, alpha) on objects with origin (0.5, 0.5),
// normalized to each object's own bounds. Never bake motion into shape geometry
// or absolute pixel offsets. Swapping a placeholder shape for a same-origin,
// same-bounds sprite needs ZERO animation edits. Shapes throwaway; MOTION is the deliverable.
//
// No linear easing anywhere — Sine / Quad / Cubic / Back only.

// ---- Centralized timing & eases -------------------------------------------
export const DUR = {
  micro: 90,    // shutter flash
  press: 120,   // button dip
  snap: 160,    // shutter squash return
  quick: 240,   // pops, checks
  base: 360,    // standard transitions
  intro: 800,   // camera intro
  fade: 500,    // scene cross-fade
  idleBob: 1800,
  idleBreathe: 2200,
  idleSway: 2000,
};

export const EASE = {
  in: 'Sine.easeIn',
  out: 'Sine.easeOut',
  inOut: 'Sine.easeInOut',     // slow-in / slow-out — the default
  quadOut: 'Quad.easeOut',
  cubicOut: 'Cubic.easeOut',
  backOut: 'Back.easeOut',     // follow-through / overshoot
  backIn: 'Back.easeIn',       // anticipation / pull-back
  backInOut: 'Back.easeInOut',
};

// Global reduced-motion flag (accessibility). Lowers amplitude, disables idle loops.
export const motionFlags = { reduced: false };
export function setReducedMotion(on) { motionFlags.reduced = !!on; }
const amp = (v) => (motionFlags.reduced ? v * 0.3 : v); // amplitude scaler

// Resolve a tween target's scene safely.
function sceneOf(target) {
  return target.scene || (target.list && target.list[0] && target.list[0].scene);
}

// Capture an object's base scale once so presets are relative, not absolute.
// A current scale of 0 means the object was pre-hidden for a pop-in; treat its
// natural scale as 1 so it animates UP to full size, not to nothing.
function baseScale(t) {
  if (t.__baseScale == null) t.__baseScale = { x: t.scaleX || 1, y: t.scaleY || 1 };
  return t.__baseScale;
}

// ---------------------------------------------------------------------------
// ENTRANCES / EXITS
// ---------------------------------------------------------------------------

// popIn — Anticipation (Back overshoot), Slow-in/out, Appeal.
// Scales from 0 up through an overshoot and settles.
export function popIn(target, opts = {}) {
  const s = sceneOf(target); if (!s) return null;
  const b = baseScale(target);
  target.setScale(0).setAlpha(opts.keepAlpha ? target.alpha : 0);
  return s.tweens.add({
    targets: target,
    scaleX: b.x, scaleY: b.y, alpha: 1,
    ease: EASE.backOut,
    duration: opts.duration ?? DUR.quick,
    delay: opts.delay ?? 0,
    onComplete: opts.onComplete,
  });
}

// popOut — reverse of popIn. Anticipation pull-back then shrink. Slow-in/out.
export function popOut(target, opts = {}) {
  const s = sceneOf(target); if (!s) return null;
  return s.tweens.add({
    targets: target,
    scaleX: 0, scaleY: 0, alpha: 0,
    ease: EASE.backIn,
    duration: opts.duration ?? DUR.quick,
    delay: opts.delay ?? 0,
    onComplete: opts.onComplete,
  });
}

// ---------------------------------------------------------------------------
// PRESS / IMPACT
// ---------------------------------------------------------------------------

// pressDip — Squash & stretch (volume-preserving), Anticipation. Button press.
export function pressDip(target, opts = {}) {
  const s = sceneOf(target); if (!s) return null;
  const b = baseScale(target);
  const k = amp(opts.amount ?? 0.12); // squash fraction
  return s.tweens.add({
    targets: target,
    scaleX: b.x * (1 + k),       // wider...
    scaleY: b.y * (1 - k),       // ...and shorter -> volume preserved (1+k)(1-k) ~= 1
    ease: EASE.quadOut,
    duration: opts.duration ?? DUR.press,
    yoyo: true,
    onComplete: opts.onComplete,
  });
}

// squashLand — Squash & stretch on landing/impact, Follow-through.
// Stretch tall on approach, squash flat on land, spring back. Volume preserved.
export function squashLand(target, opts = {}) {
  const s = sceneOf(target); if (!s) return null;
  const b = baseScale(target);
  const k = amp(opts.amount ?? 0.18);
  return s.tweens.chain({
    targets: target,
    tweens: [
      { scaleX: b.x * (1 - k), scaleY: b.y * (1 + k), ease: EASE.quadOut, duration: DUR.press }, // stretch
      { scaleX: b.x * (1 + k), scaleY: b.y * (1 - k), ease: EASE.quadOut, duration: DUR.press }, // squash
      { scaleX: b.x, scaleY: b.y, ease: EASE.backOut, duration: DUR.snap },                       // settle
    ],
    onComplete: opts.onComplete,
  });
}

// ---------------------------------------------------------------------------
// IDLE LOOPS (procedural "straight-ahead"-style continuous motion)
// idleAnim level data maps to a preset name: "bob" | "breathe" | "sway".
// Each takes the object plus an optional shadow ellipse for SECONDARY ACTION.
// ---------------------------------------------------------------------------

function staggerDelay(opts) { return opts.delay ?? Math.random() * 600; } // TIMING: desync objects

// idleBob — Arcs (vertical bob along a slight arc via paired x sway),
// Slow-in/out, Secondary action (shadow scales inversely), Timing, Appeal.
export function idleBob(target, opts = {}) {
  const s = sceneOf(target); if (!s || motionFlags.reduced) return null;
  const baseY = target.y, baseX = target.x;
  const dy = amp(opts.amount ?? 10);
  const tw = s.tweens.add({
    targets: target,
    y: baseY - dy,
    x: baseX + dy * 0.25,   // slight lateral drift -> bob travels an ARC, not a straight line
    ease: EASE.inOut,
    duration: opts.duration ?? DUR.idleBob,
    yoyo: true, repeat: -1,
    delay: staggerDelay(opts),
  });
  if (opts.shadow) attachShadow(s, opts.shadow, target, baseY, dy, opts.duration ?? DUR.idleBob, tw.delay);
  return tw;
}

// idleBreathe — Slow-in/out, volume-preserving squash & stretch, Timing, Appeal.
export function idleBreathe(target, opts = {}) {
  const s = sceneOf(target); if (!s || motionFlags.reduced) return null;
  const b = baseScale(target);
  const k = amp(opts.amount ?? 0.04);
  return s.tweens.add({
    targets: target,
    scaleX: b.x * (1 - k * 0.5), // inhale narrows slightly...
    scaleY: b.y * (1 + k),       // ...and rises -> near-constant volume
    ease: EASE.inOut,
    duration: opts.duration ?? DUR.idleBreathe,
    yoyo: true, repeat: -1,
    delay: staggerDelay(opts),
  });
}

// idleSway — Arcs (angle rocking), Slow-in/out, Timing, Appeal.
export function idleSway(target, opts = {}) {
  const s = sceneOf(target); if (!s || motionFlags.reduced) return null;
  const a = amp(opts.amount ?? 3); // degrees
  target.angle = -a;
  return s.tweens.add({
    targets: target,
    angle: a,
    ease: EASE.inOut,
    duration: opts.duration ?? DUR.idleSway,
    yoyo: true, repeat: -1,
    delay: staggerDelay(opts),
  });
}

// Secondary action: shadow ellipse scales inversely to bob height.
function attachShadow(s, shadow, target, baseY, dy, duration, delay) {
  const b = baseScale(shadow);
  s.tweens.add({
    targets: shadow,
    scaleX: b.x * 0.82, scaleY: b.y * 0.82, // shrinks/fades as object rises
    alpha: (shadow.alpha ?? 1) * 0.6,
    ease: EASE.inOut,
    duration, yoyo: true, repeat: -1, delay,
  });
}

export function idleByName(name, target, opts) {
  switch (name) {
    case 'bob': return idleBob(target, opts);
    case 'breathe': return idleBreathe(target, opts);
    case 'sway': return idleSway(target, opts);
    default: return idleBreathe(target, opts);
  }
}

// ---------------------------------------------------------------------------
// CAMERA / VIEWFINDER
// ---------------------------------------------------------------------------

// reticleSettle — Follow-through & Overlapping action: small overshoot when the
// pointer stops, giving the reticle weight. (Lag itself is done via lerp in CameraTool.)
export function reticleSettle(target, opts = {}) {
  const s = sceneOf(target); if (!s) return null;
  const b = baseScale(target);
  const k = amp(0.04);
  return s.tweens.add({
    targets: target,
    scaleX: { from: b.x * (1 + k), to: b.x },
    scaleY: { from: b.y * (1 + k), to: b.y },
    ease: EASE.backOut,
    duration: opts.duration ?? DUR.quick,
  });
}

// shutterFlash — Exaggeration (flash larger than frame), snappy Timing.
// `flash` is a rect/shape sized to the frame; expands slightly and fades.
export function shutterFlash(flash, opts = {}) {
  const s = sceneOf(flash); if (!s) return null;
  const b = baseScale(flash);
  flash.setAlpha(1).setScale(b.x, b.y);
  return s.tweens.add({
    targets: flash,
    scaleX: b.x * 1.08, scaleY: b.y * 1.08, // EXAGGERATION: bigger than the frame
    alpha: 0,
    ease: EASE.quadOut,
    duration: opts.duration ?? DUR.micro,
    onComplete: opts.onComplete,
  });
}

// ---------------------------------------------------------------------------
// FEEDBACK / UI
// ---------------------------------------------------------------------------

// checkPop — Squash & stretch + Exaggeration: Back overshoot then settle. Follow-through.
export function checkPop(target, opts = {}) {
  const s = sceneOf(target); if (!s) return null;
  const b = baseScale(target);
  target.setScale(0);
  return s.tweens.add({
    targets: target,
    scaleX: b.x, scaleY: b.y,
    ease: EASE.backOut,
    duration: opts.duration ?? DUR.quick,
    delay: opts.delay ?? 0,
    onComplete: opts.onComplete,
  });
}

// missPulse — cozy miss feedback: low-amplitude Secondary motion, Slow-in/out.
// Gentle dip + faint scale pulse. NEVER a harsh shake (Appeal).
export function missPulse(target, opts = {}) {
  const s = sceneOf(target); if (!s) return null;
  const b = baseScale(target);
  const dip = amp(opts.dip ?? 8);
  const baseY = target.y;
  s.tweens.add({
    targets: target, y: baseY + dip,
    ease: EASE.inOut, duration: DUR.base, yoyo: true,
  });
  return s.tweens.add({
    targets: target,
    scaleX: b.x * (1 - amp(0.03)), scaleY: b.y * (1 - amp(0.03)),
    ease: EASE.inOut, duration: DUR.base, yoyo: true,
    onComplete: opts.onComplete,
  });
}

// gradeReveal — Exaggeration + Appeal + Follow-through: big overshoot pop with a
// tiny settle, for the result-screen grade.
export function gradeReveal(target, opts = {}) {
  const s = sceneOf(target); if (!s) return null;
  const b = baseScale(target);
  target.setScale(0).setAlpha(0);
  return s.tweens.chain({
    targets: target,
    tweens: [
      { scaleX: b.x * 1.25, scaleY: b.y * 1.25, alpha: 1, ease: EASE.backOut, duration: DUR.base },
      { scaleX: b.x, scaleY: b.y, ease: EASE.inOut, duration: DUR.quick },
    ],
    onComplete: opts.onComplete,
  });
}

// ---------------------------------------------------------------------------
// SCENE TRANSITIONS
// ---------------------------------------------------------------------------

// fadeScene — Slow-in/out cross-fade via the scene camera. Staging.
export function fadeScene(scene, dir = 'in', opts = {}) {
  const cam = scene.cameras.main;
  const dur = opts.duration ?? DUR.fade;
  if (dir === 'in') {
    cam.fadeIn(dur, 0, 0, 0);
  } else {
    cam.fadeOut(dur, 0, 0, 0);
  }
  if (opts.onComplete) {
    const ev = dir === 'in' ? 'camerafadeincomplete' : 'camerafadeoutcomplete';
    cam.once(ev, opts.onComplete);
  }
}

export default {
  DUR, EASE, motionFlags, setReducedMotion,
  popIn, popOut, pressDip, squashLand,
  idleBob, idleBreathe, idleSway, idleByName,
  reticleSettle, shutterFlash, checkPop, missPulse, gradeReveal, fadeScene,
};
