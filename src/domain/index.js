// Logic system entry point. Owns the photo roll, per-shot evaluation (for the
// special-object dialog), and the final session evaluation on Confirm.
import { EVENTS } from '../config/events.js';
import { CONFIG } from '../config/gameConfig.js';
import { evaluate, evaluateSession } from './PhotoEvaluator.js';
import { PhotoObject } from '../objects/PhotoObject.js';

export function initLogicSystem(scene, bus, levelData) {
  const objects = levelData.objects;

  // Build visible PhotoObjects (placeholder shapes) into the zoomable world layer.
  const sprites = new Map();
  objects.forEach((o) => {
    const po = new PhotoObject(scene, o);
    if (scene.world) scene.world.add(po);
    sprites.set(o.id, po);
  });

  const evalObjects = objects.map((o) => ({
    id: o.id, bbox: o.bbox, mission: o.mission, isSpecial: o.isSpecial, name: o.name,
  }));

  const roll = [];            // every photo taken: { frameBounds, thumbKey }
  let specialShown = false;

  const onPhoto = ({ frameBounds, thumbKey }) => {
    roll.push({ frameBounds, thumbKey });

    // Per-shot evaluate only to fire the special-object dialog once.
    const res = evaluate(frameBounds, evalObjects, { isComplete: () => false }, CONFIG);
    if (res.success) {
      const sprite = sprites.get(res.objectId);
      if (sprite) sprite.flashHighlight();
    }
    if (res.success && res.isSpecial && !specialShown) {
      specialShown = true;
      const obj = objects.find((o) => o.id === res.objectId);
      if (obj && obj.dialog) {
        bus.emit(EVENTS.DIALOG_SHOW, { speaker: obj.dialog.speaker, lines: obj.dialog.lines });
      }
    }
  };

  const onSubmit = () => {
    const result = evaluateSession(roll, objects, CONFIG); // forgiving, best framing per mission
    bus.emit(EVENTS.LEVEL_COMPLETED, result);
  };

  bus.on(EVENTS.PHOTO_TAKEN, onPhoto);
  bus.on(EVENTS.SUBMIT_REQUESTED, onSubmit);
  scene.events.once('shutdown', () => {
    bus.off(EVENTS.PHOTO_TAKEN, onPhoto);
    bus.off(EVENTS.SUBMIT_REQUESTED, onSubmit);
  });

  console.log('[domain] logic system loaded:', levelData.id);
  return { roll, sprites };
}

export default initLogicSystem;
