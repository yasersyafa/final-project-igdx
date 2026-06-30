// UI system entry point.
import { HUD } from './HUD.js';

export function initUISystem(scene, bus, levelData) {
  const hud = new HUD(scene, bus, levelData);
  console.log('[ui] ui system loaded:', levelData.id);
  return hud;
}

export default initUISystem;
