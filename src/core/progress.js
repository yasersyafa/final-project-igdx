// Progression persistence. Stores the best result per level in localStorage.
// Pure grading helpers (gradeForFrac / starsForFrac) reuse CONFIG.GRADE so grade
// logic lives in ONE place. All storage access is try/catch-guarded so the game
// still runs where localStorage is unavailable (private mode, bun test, etc.).
import { CONFIG } from '../config/gameConfig.js';

const KEY = 'photowalk.progress';

// gradeForFrac — shared grade + color from a score fraction (0..1).
export function gradeForFrac(frac) {
  if (frac >= CONFIG.GRADE.gold)   return { grade: 'Gold',   color: '#ffd24a' };
  if (frac >= CONFIG.GRADE.silver) return { grade: 'Silver', color: '#cfd6dc' };
  return { grade: 'Bronze', color: '#cd7f32' };
}

// starsForFrac — Gold -> 3, Silver -> 2, else -> 1.
export function starsForFrac(frac) {
  if (frac >= CONFIG.GRADE.gold)   return 3;
  if (frac >= CONFIG.GRADE.silver) return 2;
  return 1;
}

function storage() {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage;
  } catch { return null; }
}

// loadProgress -> { [levelIndex]: { bestScore, bestFrac, grade, stars } }
export function loadProgress() {
  const s = storage();
  if (!s) return {};
  try {
    const raw = s.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch { return {}; }
}

function saveProgress(data) {
  const s = storage();
  if (!s) return false;
  try { s.setItem(KEY, JSON.stringify(data)); return true; }
  catch { return false; }
}

// recordResult — persist a level result if it beats the stored best (by frac).
// Returns { improved, entry } where entry is the best-known record for the level.
export function recordResult(levelIndex, { frac, total }) {
  const data = loadProgress();
  const prev = data[levelIndex];
  const { grade } = gradeForFrac(frac);
  const stars = starsForFrac(frac);
  const improved = !prev || frac > prev.bestFrac;

  if (improved) {
    data[levelIndex] = { bestScore: Math.round(total ?? 0), bestFrac: frac, grade, stars };
    saveProgress(data);
    return { improved: true, entry: data[levelIndex] };
  }
  return { improved: false, entry: prev };
}

export default { gradeForFrac, starsForFrac, loadProgress, recordResult };
