import { test, expect } from 'bun:test';
import { capturedMissionIds } from '../src/domain/PhotoEvaluator.js';

const CONFIG = { CAPTURE_THRESHOLD: 0.55 };

// frame 360x270 centered at (500,400) -> top-left (320,265)
const frameA = { x: 320, y: 265, w: 360, h: 270 };
// far-away frame that covers nothing near objects below
const frameFar = { x: 0, y: 0, w: 40, h: 40 };

const objs = [
  { id: 'a', mission: 'x', bbox: { x: 480, y: 380, w: 40, h: 40 } }, // inside frameA
  { id: 'b', mission: 'y', bbox: { x: 900, y: 600, w: 40, h: 40 } }, // outside frameA
  { id: 'deco', bbox: { x: 480, y: 380, w: 40, h: 40 } },            // no mission -> ignored
];

test('captured: object fully covered in a photo is included', () => {
  const ids = capturedMissionIds([{ frameBounds: frameA }], objs, CONFIG);
  expect(ids.has('a')).toBe(true);
});

test('captured: non-covered mission excluded', () => {
  const ids = capturedMissionIds([{ frameBounds: frameA }], objs, CONFIG);
  expect(ids.has('b')).toBe(false);
});

test('captured: non-mission object never included', () => {
  const ids = capturedMissionIds([{ frameBounds: frameA }], objs, CONFIG);
  expect(ids.has('deco')).toBe(false);
});

test('captured: empty roll -> empty set', () => {
  const ids = capturedMissionIds([], objs, CONFIG);
  expect(ids.size).toBe(0);
});

test('captured: any photo suffices across the roll', () => {
  const ids = capturedMissionIds([{ frameBounds: frameFar }, { frameBounds: frameA }], objs, CONFIG);
  expect(ids.has('a')).toBe(true);
});

test('captured: deleting the only covering photo drops the id', () => {
  const full = capturedMissionIds([{ frameBounds: frameA }], objs, CONFIG);
  expect(full.has('a')).toBe(true);
  const afterDelete = capturedMissionIds([{ frameBounds: frameFar }], objs, CONFIG);
  expect(afterDelete.has('a')).toBe(false);
});
