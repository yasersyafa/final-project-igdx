// Per-shot rating tiers. NOT a frozen contract — safe to tune.
// Maps a successful shot's framingScore (0..SCORING.base = 100) to an
// encouraging label. Cozy: only successful mission shots get a badge; there is
// no punishing tier (a miss keeps the existing gentle reticle pulse).
export const RATING = {
  // Checked high -> low against framingScore. Last tier (min: 0) always matches.
  tiers: [
    { key: 'perfect', label: 'Perfect!', min: 88, color: '#ffd24a' },
    { key: 'great',   label: 'Great!',   min: 72, color: '#9be07a' },
    { key: 'good',    label: 'Good',     min: 0,  color: '#cfd6dc' },
  ],
};

// rateShot — pure. Returns the matching tier { key, label, color } for a given
// framingScore, or null if score is not a finite number.
export function rateShot(framingScore) {
  if (typeof framingScore !== 'number' || !Number.isFinite(framingScore)) return null;
  for (const tier of RATING.tiers) {
    if (framingScore >= tier.min) return tier;
  }
  return null;
}

export default { RATING, rateShot };
