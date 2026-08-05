// AudioManager — observer on the EventBus. Sole listener that turns UI events into sfx,
// so callers (Button.js etc.) never touch Phaser.Sound directly. init() once with any
// scene's `this.sound` (Phaser's sound manager is shared game-wide, not per-scene).
import { bus } from './EventBus.js';
import { EVENTS } from '../config/events.js';

let soundManager = null;

function play(key, config) {
  if (!soundManager) return;
  try { soundManager.play(key, config); } catch { /* audio optional */ }
}

// rate = playback speed, which also shifts pitch — cheap way to add variation
// without extra audio files.
const randomRate = (min, max) => min + Math.random() * (max - min);

const LISTENERS = [
  [EVENTS.UI_BUTTON_CLICK, () => play('sfx_button_click', { volume: 0.5 })],
  [EVENTS.UI_BUTTON_HOVER, () => play('sfx_button_hover', { volume: 0.35, rate: randomRate(0.9, 1.1) })],
];

export function init(sound) {
  if (soundManager) return; // already wired, avoid duplicate listeners on scene re-entry
  soundManager = sound;
  LISTENERS.forEach(([event, handler]) => bus.on(event, handler));
}

export default { init };
