import { test, expect } from 'bun:test';
import { coverage, centering, framingScore } from '../src/domain/FramingScorer.js';

const SCORING = { base: 100, wCenter: 0.5, wCoverage: 0.5 };

// frame 360x270 centered at (500,400) -> top-left (320, 265)
const centeredFrame = { x: 320, y: 265, w: 360, h: 270 };

test('coverage: object fully inside frame = 1', () => {
  const obj = { x: 480, y: 380, w: 40, h: 40 };
  expect(coverage(obj, centeredFrame)).toBe(1);
});

test('coverage: object fully outside frame = 0', () => {
  const obj = { x: 1000, y: 1000, w: 40, h: 40 };
  expect(coverage(obj, centeredFrame)).toBe(0);
});

test('coverage: half-overlapping object ~ 0.5', () => {
  // object straddling the right edge of the frame (frame right = 680)
  const obj = { x: 660, y: 380, w: 40, h: 40 }; // 660..700, frame to 680 => half in
  expect(coverage(obj, centeredFrame)).toBeCloseTo(0.5, 5);
});

test('centering: object centered = 1', () => {
  const obj = { x: 490, y: 390, w: 20, h: 20 }; // centroid 500,400 = frame center
  expect(centering(obj, centeredFrame)).toBeCloseTo(1, 5);
});

test('centering: off-center is lower than centered', () => {
  const centered = { x: 490, y: 390, w: 20, h: 20 };
  const off = { x: 640, y: 390, w: 20, h: 20 };
  expect(centering(off, centeredFrame)).toBeLessThan(centering(centered, centeredFrame));
});

test('framingScore: perfect framing approaches base', () => {
  const obj = { x: 490, y: 390, w: 20, h: 20 };
  expect(framingScore(obj, centeredFrame, SCORING)).toBeCloseTo(100, 1);
});

test('framingScore: off-center scores less than perfect', () => {
  const perfect = { x: 490, y: 390, w: 20, h: 20 };
  const off = { x: 640, y: 390, w: 20, h: 20 };
  expect(framingScore(off, centeredFrame, SCORING))
    .toBeLessThan(framingScore(perfect, centeredFrame, SCORING));
});
