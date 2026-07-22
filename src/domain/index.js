// Logic system entry point. Owns the photo roll, per-shot evaluation (for the
// special-object dialog), and the final session evaluation on Confirm.
import { EVENTS } from '../config/events.js';
import { CONFIG } from '../config/gameConfig.js';
import { evaluate, evaluateSession, capturedMissionIds } from './PhotoEvaluator.js';
import { rateShot } from '../config/feedbackConfig.js';
import { PhotoObject } from '../objects/PhotoObject.js';
import { addPhoto, removePhoto, textureToDataURL } from '../core/gallery.js';
import { L } from '../core/i18n.js';

export function initLogicSystem(scene, bus, levelData) {
  const objects = levelData.objects;

  // Ambient decor: rendered for atmosphere but NOT photographable targets. Added
  // first so it sits behind the mission objects, and never registered for eval.
  (levelData.decor || []).forEach((d) => {
    const po = new PhotoObject(scene, { ...d, decor: true });
    if (scene.world) scene.world.add(po);
  });

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

  const roll = [];            // every photo taken: { id, frameBounds, thumbKey }
  const captured = new Set();  // mission objectIds currently captured in the roll
  let specialShown = false;

  const onPhoto = ({ id, frameBounds, thumbKey }) => {
    roll.push({ id, frameBounds, thumbKey });

    // Persist the shot to the per-level gallery (auto-save on capture). The
    // snapshot texture exists here since PHOTO_TAKEN fires in its callback.
    if (thumbKey && scene.textures.exists(thumbKey)) {
      const dataUrl = textureToDataURL(scene, thumbKey);
      if (dataUrl) addPhoto(levelData.id, { id, dataUrl });
    }

    // Per-shot evaluate: drives live feedback + the special-object dialog.
    const res = evaluate(frameBounds, evalObjects, { isComplete: () => false }, CONFIG);
    if (res.success) {
      const sprite = sprites.get(res.objectId);
      if (sprite) sprite.flashHighlight();
      // Cozy per-shot feedback: encouraging Good / Great / Perfect badge.
      const tier = rateShot(res.framingScore);
      if (tier) bus.emit(EVENTS.SHOT_RATED, tier);
      // Live shot-list check-off: fire once per mission object.
      if (!captured.has(res.objectId)) {
        captured.add(res.objectId);
        bus.emit(EVENTS.MISSION_CAPTURED, { objectId: res.objectId });
      }
    }
    if (res.success && res.isSpecial && !specialShown) {
      specialShown = true;
      const obj = objects.find((o) => o.id === res.objectId);
      if (obj && obj.dialog) {
        bus.emit(EVENTS.DIALOG_SHOW, {
          speaker: L(obj.dialog.speaker),
          lines: (obj.dialog.lines || []).map(L),
        });
      }
    }
  };

  // Player deleted a photo: drop it from the roll and reconcile the shot-list ticks
  // (a mission may no longer be captured; re-shooting it later re-fires its pop).
  const onPhotoDeleted = ({ id }) => {
    const i = roll.findIndex((p) => p.id === id);
    if (i === -1) return;
    roll.splice(i, 1);
    removePhoto(levelData.id, id); // keep gallery in sync with roll deletes
    const ids = capturedMissionIds(roll, evalObjects, CONFIG);
    captured.clear();
    ids.forEach((x) => captured.add(x));
    bus.emit(EVENTS.MISSIONS_SYNC, { capturedIds: [...ids] });
  };

  const onSubmit = () => {
    const result = evaluateSession(roll, objects, CONFIG); // forgiving, best framing per mission
    bus.emit(EVENTS.LEVEL_COMPLETED, result);
  };

  bus.on(EVENTS.PHOTO_TAKEN, onPhoto);
  bus.on(EVENTS.PHOTO_DELETED, onPhotoDeleted);
  bus.on(EVENTS.SUBMIT_REQUESTED, onSubmit);
  scene.events.once('shutdown', () => {
    bus.off(EVENTS.PHOTO_TAKEN, onPhoto);
    bus.off(EVENTS.PHOTO_DELETED, onPhotoDeleted);
    bus.off(EVENTS.SUBMIT_REQUESTED, onSubmit);
  });

  console.log('[domain] logic system loaded:', levelData.id);
  return { roll, sprites };
}

export default initLogicSystem;
