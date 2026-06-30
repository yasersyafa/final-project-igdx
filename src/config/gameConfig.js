// FROZEN CONTRACT — do not change without telling the whole team.
export const CONFIG = {
  FRAME_SIZE: { width: 360, height: 270 }, // viewfinder size in px
  CAPTURE_THRESHOLD: 0.55,                 // min coverage to count as captured
  SCORING: { base: 100, wCenter: 0.5, wCoverage: 0.5 }, // no time component
  GRADE: { gold: 0.85, silver: 0.6 },      // fraction of max score
};

// World size — matches main.js Phaser config. Used by camera clamping.
export const WORLD = { width: 1280, height: 720 };
