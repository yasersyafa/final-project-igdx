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

    if (o.id.endsWith("_after")) {
      po.setVisible(false);
    }
  });

  const evalObjects = objects.map((o) => ({
    id: o.id, bbox: o.bbox, mission: o.mission, isSpecial: o.isSpecial, name: o.name,
  }));

  // Guide's own portrait art isn't in yet (pending asset) — skip the portrait
  // only for Guide-speaker lines; every other dialog defaults to the happy pose.
  const isGuideDialog = (d) => d && d.speaker && d.speaker.en === 'Guide';

  const AFTER_SUFFIX = '_after';
  const roll = [];            // every photo taken: { id, frameBounds, thumbKey }
  const captured = new Set(); // mission objectIds currently captured in the roll
  const swapped = new Set();  // before-object ids that have already flipped to "_after"
                               // (tracked separately from `captured`: a "before" object
                               // may carry no mission at all, so it can never appear in
                               // `captured`, but it must still be able to trigger its swap)
  let specialShown = false;

  const onPhoto = ({ id, frameBounds, thumbKey }) => {
    roll.push({ id, frameBounds, thumbKey });

    const activeEvalObjects = evalObjects.filter((o) => {
      if (o.id.endsWith(AFTER_SUFFIX)) {
        const beforeId = o.id.slice(0, -AFTER_SUFFIX.length);
        return swapped.has(beforeId); // only eligible once its "before" has been swapped away
      }
      const hasAfterVariant = evalObjects.some((e) => e.id === o.id + AFTER_SUFFIX);
      return hasAfterVariant ? !swapped.has(o.id) : true; // retire "before" once swapped
    });

    // Per-shot evaluate: drives live feedback + the special-object dialog.
    const res = evaluate(frameBounds, activeEvalObjects, { isComplete: () => false }, CONFIG);
    // Whatever object was actually best-framed this shot, success or not — a
    // mission-less "before" object always comes back as res.success === false
    // (reason: 'wrong_object'), but it's still the matched object, and the
    // swap below needs to fire off of it regardless of mission status.
    const matchedObj = res.objectId ? objects.find((o) => o.id === res.objectId) : null;

    // Persist the shot to the per-level gallery (auto-save on capture). The
    // snapshot texture exists here since PHOTO_TAKEN fires in its callback.
    // objectId tags mission captures so the album can show its field notes;
    // a random shot saves with objectId null (no educational info).
    if (thumbKey && scene.textures.exists(thumbKey)) {
      const dataUrl = textureToDataURL(scene, thumbKey);
      const objectId = res.success ? res.objectId : null;
      if (dataUrl) addPhoto(levelData.id, { id, dataUrl, objectId });
    }

    let isFirstCapture = false;
    if (res.success) {
      const sprite = sprites.get(res.objectId);
      if (sprite) sprite.flashHighlight();
      // Cozy per-shot feedback: encouraging Good / Great / Perfect badge.
      const tier = rateShot(res.framingScore);
      if (tier) bus.emit(EVENTS.SHOT_RATED, tier);
      // Live shot-list check-off: fire once per mission object.
      if (!captured.has(res.objectId)) {
        captured.add(res.objectId);
        isFirstCapture = true;
        bus.emit(EVENTS.MISSION_CAPTURED, { objectId: res.objectId });
      }
    }

    // before -> after swap: fires the first time a "before" object is the
    // best-framed match, independent of mission/success — a "before" object
    // with no mission field will never satisfy res.success, so this cannot be
    // gated on that like the after-dialog block below is.
    if (matchedObj && matchedObj.challenge === "before" && !swapped.has(matchedObj.id)) {
      swapped.add(matchedObj.id);

      if (matchedObj.dialog) {
        bus.emit(EVENTS.DIALOG_SHOW, {
          speaker: L(matchedObj.dialog.speaker),
          lines: (matchedObj.dialog.lines || []).map(L),
          portrait: isGuideDialog(matchedObj.dialog) ? null : 'girl_happy',
        });
      }
      const beforeSprite = sprites.get(matchedObj.id);
      if (beforeSprite) {
        beforeSprite.flashHighlight(); // visual feedback even when it scores no mission
        beforeSprite.setVisible(false);
      }
      const afterSprite = sprites.get(matchedObj.id + AFTER_SUFFIX);
      if (afterSprite) afterSprite.setVisible(true);
    }

    // "after" dialog fires once, on the first successful mission capture of
    // the after object (this one stays gated on res.success: the after object
    // is the one that's actually supposed to carry the mission).
    if (res.success && isFirstCapture) {
      const obj = objects.find((o) => o.id === res.objectId);
      if (obj && obj.dialog && obj.challenge === "after") {
        bus.emit(EVENTS.DIALOG_SHOW, {
          speaker: L(obj.dialog.speaker),
          lines: (obj.dialog.lines || []).map(L),
          portrait: isGuideDialog(obj.dialog) ? null : 'girl_happy',
        });
      }
    }

    if (res.success && res.isSpecial && !specialShown) {
      specialShown = true;
      const specialObj = objects.find((o) => o.id === res.objectId);
      if (specialObj && specialObj.dialog) {
        bus.emit(EVENTS.DIALOG_SHOW, {
          speaker: L(specialObj.dialog.speaker),
          lines: (specialObj.dialog.lines || []).map(L),
          portrait: isGuideDialog(specialObj.dialog) ? null : 'girl_happy',
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
