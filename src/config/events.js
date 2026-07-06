// FROZEN CONTRACT — do not change without telling the whole team.
// Shared event names. Every system talks only through these via the EventBus.
export const EVENTS = {
  CAMERA_READY:    'camera:ready',     // intro transition finished -> idle
  RAISE_REQUESTED: 'camera:raiseReq',  // UI asked to raise the camera (from IDLE)
  CAMERA_RAISED:   'camera:raised',    // player raised camera -> zoomed AIMING, hide HUD
  CAMERA_LOWERED:  'camera:lowered',   // player lowered camera -> IDLE, show HUD

  PHOTO_TAKEN:     'photo:taken',      // a shot fired -> { frameBounds, thumbKey, captured }
  SHOT_RATED:      'photo:rated',      // successful mission shot -> { key, label, color }
  MISSION_CAPTURED:'mission:captured', // first good shot of a mission -> { objectId }
  SUBMIT_REQUESTED:'submit:requested', // Confirm clicked -> finalize & evaluate session

  DIALOG_SHOW:     'dialog:show',      // -> { speaker, lines: string[] }
  DIALOG_CLOSED:   'dialog:closed',

  LEVEL_COMPLETED: 'level:completed',  // -> { total, max, breakdown, missionResults }
};

// PHOTO_TAKEN.captured = the per-shot evaluate() result (CAPTURE_RESULT shape):
// {
//   success: boolean,        // framed a valid mission object well enough
//   objectId: string|null,
//   missionId: string|null,
//   isSpecial: boolean,
//   framingScore: number,    // 0..scoring.base
//   reason: 'ok'|'miss_no_object'|'miss_coverage'|'wrong_object'|'already_done'
// }
//
// SHOT_RATED payload = the rating tier for a successful mission shot:
// { key: 'perfect'|'great'|'good', label: string, color: string }
//
// MISSION_CAPTURED payload = { objectId } — fired once, the first time a mission
// object is photographed at coverage >= CAPTURE_THRESHOLD. Drives the live
// shot-list check-off in the HUD.
//
// LEVEL_COMPLETED.missionResults = per mission object:
// [{ objectId, name, mission, isSpecial, done: boolean, score: number }]
