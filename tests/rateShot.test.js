import { test, expect } from 'bun:test';
import { rateShot } from '../src/config/feedbackConfig.js';

test('rateShot: high score -> perfect', () => {
  expect(rateShot(95).key).toBe('perfect');
  expect(rateShot(88).key).toBe('perfect'); // boundary inclusive
});

test('rateShot: mid score -> great', () => {
  expect(rateShot(80).key).toBe('great');
  expect(rateShot(72).key).toBe('great'); // boundary inclusive
});

test('rateShot: low success score -> good', () => {
  expect(rateShot(71).key).toBe('good');
  expect(rateShot(40).key).toBe('good');
  expect(rateShot(0).key).toBe('good'); // any success still gets encouragement
});

test('rateShot: non-finite input -> null', () => {
  expect(rateShot(NaN)).toBeNull();
  expect(rateShot(undefined)).toBeNull();
  expect(rateShot('90')).toBeNull();
});

test('rateShot: returned tier carries a label and color', () => {
  const t = rateShot(90);
  expect(t.label).toBe('Perfect!');
  expect(typeof t.color).toBe('string');
});
