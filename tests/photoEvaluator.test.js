import { test, expect } from 'bun:test';
import { evaluate, evaluateSession } from '../src/domain/PhotoEvaluator.js';
import { MissionManager } from '../src/domain/MissionManager.js';

const CONFIG = {
  CAPTURE_THRESHOLD: 0.55,
  SCORING: { base: 100, wCenter: 0.5, wCoverage: 0.5 },
};

const objects = [
  { id: 'bench', bbox: { x: 480, y: 380, w: 40, h: 40 }, mission: 'sit', isSpecial: false },
  { id: 'cat', bbox: { x: 900, y: 600, w: 60, h: 50 }, mission: 'nap', isSpecial: true },
  { id: 'rock', bbox: { x: 200, y: 200, w: 30, h: 30 } }, // no mission -> wrong_object
];

const frameAt = (cx, cy) => ({ x: cx - 180, y: cy - 135, w: 360, h: 270 });

test('perfect framing of a mission object -> success ok', () => {
  const mm = new MissionManager(objects);
  const r = evaluate(frameAt(500, 400), objects, mm, CONFIG);
  expect(r.success).toBe(true);
  expect(r.reason).toBe('ok');
  expect(r.objectId).toBe('bench');
  expect(r.framingScore).toBeGreaterThan(0);
  expect(r.isSpecial).toBe(false);
});

test('special object framed -> isSpecial true', () => {
  const mm = new MissionManager(objects);
  const r = evaluate(frameAt(930, 625), objects, mm, CONFIG);
  expect(r.success).toBe(true);
  expect(r.objectId).toBe('cat');
  expect(r.isSpecial).toBe(true);
});

test('frame on empty space -> miss_no_object', () => {
  const mm = new MissionManager(objects);
  const r = evaluate(frameAt(50, 50), objects, mm, CONFIG);
  expect(r.success).toBe(false);
  expect(r.reason).toBe('miss_no_object');
});

test('partial coverage below threshold -> miss_coverage', () => {
  const mm = new MissionManager(objects);
  // big object, frame catches only a sliver
  const big = [{ id: 'wall', bbox: { x: 0, y: 0, w: 800, h: 800 }, mission: 'wall' }];
  const r = evaluate(frameAt(380, 270), big, new MissionManager(big), CONFIG);
  expect(r.success).toBe(false);
  expect(r.reason).toBe('miss_coverage');
});

test('non-mission object framed -> wrong_object', () => {
  const mm = new MissionManager(objects);
  const r = evaluate(frameAt(215, 215), objects, mm, CONFIG);
  expect(r.success).toBe(false);
  expect(r.reason).toBe('wrong_object');
  expect(r.objectId).toBe('rock');
});

test('already completed mission -> already_done', () => {
  const mm = new MissionManager(objects);
  mm.complete('bench');
  const r = evaluate(frameAt(500, 400), objects, mm, CONFIG);
  expect(r.success).toBe(false);
  expect(r.reason).toBe('already_done');
});

const SESS_CONFIG = { ...CONFIG };
const sessObjs = [
  { id: 'bench', name: 'Bench', mission: 'sit', isSpecial: false, bbox: { x: 480, y: 380, w: 40, h: 40 } },
  { id: 'cat', name: 'Cat', mission: 'nap', isSpecial: true, bbox: { x: 900, y: 600, w: 60, h: 50 } },
];

test('session: empty roll completes nothing', () => {
  const r = evaluateSession([], sessObjs, SESS_CONFIG);
  expect(r.total).toBe(0);
  expect(r.max).toBe(200);
  expect(r.missionResults.every((m) => !m.done)).toBe(true);
});

test('session: one good photo per mission completes both', () => {
  const photos = [
    { frameBounds: frameAt(500, 400) }, // bench
    { frameBounds: frameAt(930, 625) }, // cat
  ];
  const r = evaluateSession(photos, sessObjs, SESS_CONFIG);
  expect(r.missionResults.filter((m) => m.done).length).toBe(2);
  expect(r.total).toBeGreaterThan(0);
});

test('session: keeps the BEST framing across duplicate shots', () => {
  const sloppy = evaluateSession([{ frameBounds: frameAt(560, 440) }], sessObjs, SESS_CONFIG);
  const both = evaluateSession(
    [{ frameBounds: frameAt(560, 440) }, { frameBounds: frameAt(500, 400) }], sessObjs, SESS_CONFIG);
  const benchSloppy = sloppy.missionResults.find((m) => m.objectId === 'bench').score;
  const benchBest = both.missionResults.find((m) => m.objectId === 'bench').score;
  expect(benchBest).toBeGreaterThanOrEqual(benchSloppy);
});
