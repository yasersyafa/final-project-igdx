// Level registry. JSON imported and bundled by `bun build`.
import level1 from "../data/levels/level1.json";
import level4 from "../data/levels/level4.json";

export const LEVELS = [level1, level4];
export function levelByIndex(i) {
  return LEVELS[Phaser_clamp(i, 0, LEVELS.length - 1)];
}
function Phaser_clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}
