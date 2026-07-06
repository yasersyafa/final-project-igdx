import { test, expect, beforeEach } from 'bun:test';
import { gradeForFrac, starsForFrac, loadProgress, recordResult } from '../src/core/progress.js';

// In-memory localStorage shim (bun test has no DOM).
function installStorage() {
  const map = new Map();
  globalThis.localStorage = {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, String(v)); },
    removeItem: (k) => { map.delete(k); },
    clear: () => { map.clear(); },
  };
}
beforeEach(installStorage);

test('gradeForFrac: boundaries', () => {
  expect(gradeForFrac(0.85).grade).toBe('Gold');
  expect(gradeForFrac(0.84).grade).toBe('Silver');
  expect(gradeForFrac(0.6).grade).toBe('Silver');
  expect(gradeForFrac(0.59).grade).toBe('Bronze');
  expect(gradeForFrac(0).grade).toBe('Bronze');
});

test('starsForFrac: boundaries', () => {
  expect(starsForFrac(0.9)).toBe(3);
  expect(starsForFrac(0.85)).toBe(3);
  expect(starsForFrac(0.7)).toBe(2);
  expect(starsForFrac(0.6)).toBe(2);
  expect(starsForFrac(0.3)).toBe(1);
});

test('recordResult: first play saves and reports improved', () => {
  const { improved, entry } = recordResult(0, { frac: 0.7, total: 140 });
  expect(improved).toBe(true);
  expect(entry.stars).toBe(2);
  expect(entry.grade).toBe('Silver');
  expect(loadProgress()[0].bestFrac).toBe(0.7);
});

test('recordResult: worse run does not overwrite', () => {
  recordResult(0, { frac: 0.9, total: 180 });
  const { improved } = recordResult(0, { frac: 0.5, total: 100 });
  expect(improved).toBe(false);
  expect(loadProgress()[0].bestFrac).toBe(0.9);
  expect(loadProgress()[0].stars).toBe(3);
});

test('recordResult: better run overwrites', () => {
  recordResult(1, { frac: 0.5, total: 100 });
  const { improved, entry } = recordResult(1, { frac: 0.88, total: 176 });
  expect(improved).toBe(true);
  expect(entry.stars).toBe(3);
  expect(loadProgress()[1].bestFrac).toBe(0.88);
});

test('loadProgress: empty when nothing stored', () => {
  expect(loadProgress()).toEqual({});
});
