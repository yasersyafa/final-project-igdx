// Pure evaluator. No Phaser. Returns the CAPTURE_RESULT contract shape.
import { coverage, framingScore } from './FramingScorer.js';

// evaluateSession — finalize a whole roll of photos against the level's missions.
// Cozy & forgiving: every mission object that is covered >= threshold in ANY photo
// counts, scored by the BEST framing across the roll. (No "best candidate" contest.)
// photos = [{ frameBounds }], objects = full level objects.
// -> { total, max, breakdown, missionResults }
export function evaluateSession(photos, objects, config) {
  const threshold = config.CAPTURE_THRESHOLD;
  const scoring = config.SCORING;
  const missionObjs = objects.filter((o) => o.mission);

  const missionResults = missionObjs.map((o) => {
    let best = 0;
    for (const p of photos) {
      if (coverage(o.bbox, p.frameBounds) >= threshold) {
        best = Math.max(best, framingScore(o.bbox, p.frameBounds, scoring));
      }
    }
    const score = Math.round(best);
    return {
      objectId: o.id,
      name: o.name,
      mission: o.mission,
      isSpecial: !!o.isSpecial,
      done: score > 0,
      score,
    };
  });

  const total = missionResults.reduce((a, r) => a + r.score, 0);
  const max = missionObjs.length * scoring.base;
  const breakdown = {};
  missionResults.forEach((r) => { if (r.done) breakdown[r.objectId] = r.score; });
  return { total, max, breakdown, missionResults };
}

// capturedMissionIds — pure. Which mission objects are captured in a roll: any object
// with a `mission` covered >= CAPTURE_THRESHOLD in at least one photo. Used for live
// shot-list reconciliation (e.g. after a photo is deleted). Returns a Set of ids.
export function capturedMissionIds(photos, objects, config) {
  const threshold = config.CAPTURE_THRESHOLD;
  const ids = new Set();
  for (const o of objects) {
    if (!o.mission) continue;
    for (const p of photos) {
      if (coverage(o.bbox, p.frameBounds) >= threshold) { ids.add(o.id); break; }
    }
  }
  return ids;
}

const EMPTY = {
  success: false,
  objectId: null,
  missionId: null,
  isSpecial: false,
  framingScore: 0,
  reason: 'miss_no_object',
};

// evaluate(frameBounds, objects, missionManager, config) -> CAPTURE_RESULT
export function evaluate(frameBounds, objects, missionManager, config) {
  const threshold = config.CAPTURE_THRESHOLD;
  const scoring = config.SCORING;

  // any object overlapping the frame at all
  const overlapping = objects.filter((o) => coverage(o.bbox, frameBounds) > 0);
  if (overlapping.length === 0) {
    return { ...EMPTY, reason: 'miss_no_object' };
  }

  // candidates that meet the coverage threshold
  const covered = overlapping.filter((o) => coverage(o.bbox, frameBounds) >= threshold);
  if (covered.length === 0) {
    return { ...EMPTY, reason: 'miss_coverage' };
  }

  // best candidate = highest framingScore
  let best = covered[0];
  let bestScore = framingScore(best.bbox, frameBounds, scoring);
  for (let i = 1; i < covered.length; i++) {
    const s = framingScore(covered[i].bbox, frameBounds, scoring);
    if (s > bestScore) { best = covered[i]; bestScore = s; }
  }

  // framed object is not a mission target
  if (!best.mission) {
    return {
      success: false,
      objectId: best.id,
      missionId: null,
      isSpecial: !!best.isSpecial,
      framingScore: 0,
      reason: 'wrong_object',
    };
  }

  // mission already done
  if (missionManager.isComplete(best.id)) {
    return {
      success: false,
      objectId: best.id,
      missionId: best.id,
      isSpecial: !!best.isSpecial,
      framingScore: 0,
      reason: 'already_done',
    };
  }

  // valid, incomplete mission target -> success
  return {
    success: true,
    objectId: best.id,
    missionId: best.id,
    isSpecial: !!best.isSpecial,
    framingScore: Math.round(bestScore),
    reason: 'ok',
  };
}

export default { evaluate };
