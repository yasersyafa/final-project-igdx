// Pure framing math. No Phaser imports — unit-testable with `bun test`.
// bbox / frameBounds are {x, y, w, h} in world coords (top-left origin).

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function intersectionArea(a, b) {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.w, b.x + b.w);
  const y2 = Math.min(a.y + a.h, b.y + b.h);
  const w = x2 - x1;
  const h = y2 - y1;
  if (w <= 0 || h <= 0) return 0;
  return w * h;
}

function centroid(box) {
  return { x: box.x + box.w / 2, y: box.y + box.h / 2 };
}

// coverage = area(intersection) / area(objectBbox), 0..1
export function coverage(objectBbox, frameBounds) {
  const objArea = objectBbox.w * objectBbox.h;
  if (objArea <= 0) return 0;
  return clamp(intersectionArea(objectBbox, frameBounds) / objArea, 0, 1);
}

// centering = 1 - clamp(dist(objCentroid, frameCenter) / halfDiagonal, 0, 1)
export function centering(objectBbox, frameBounds) {
  const oc = centroid(objectBbox);
  const fc = centroid(frameBounds);
  const dist = Math.hypot(oc.x - fc.x, oc.y - fc.y);
  const halfDiag = Math.hypot(frameBounds.w, frameBounds.h) / 2;
  if (halfDiag <= 0) return 0;
  return 1 - clamp(dist / halfDiag, 0, 1);
}

// framingScore = base * (wCenter*centering + wCoverage*coverage)
export function framingScore(objectBbox, frameBounds, config) {
  const cen = centering(objectBbox, frameBounds);
  const cov = coverage(objectBbox, frameBounds);
  return config.base * (config.wCenter * cen + config.wCoverage * cov);
}

export default { coverage, centering, framingScore };
