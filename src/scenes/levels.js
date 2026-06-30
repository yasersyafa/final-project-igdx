// Level registry. JSON imported and bundled by `bun build`.
import level1 from '../data/levels/level1.json';
import level2 from '../data/levels/level2.json';
import level3 from '../data/levels/level3.json';

export const LEVELS = [level1, level2, level3];
export function levelByIndex(i) {
  return LEVELS[Phaser_clamp(i, 0, LEVELS.length - 1)];
}
function Phaser_clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
