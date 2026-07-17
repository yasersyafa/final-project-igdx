# a cozy photography game

Phaser 3 in the browser. **Bun is the toolchain only** (package manager,
`bun build` bundler, `bun test`). Phaser never runs inside the Bun runtime.

## Run

```bash
bun install
bun run dev      # builds dist/main.js then serves http://localhost:3000
```

Other scripts:

```bash
bun run build    # bun build src/main.js --outdir dist --target browser
bun run watch    # rebuild on change
bun run serve    # static server only (expects dist/ already built)
bun test         # pure-logic unit tests
```

Open http://localhost:3000 — click **Start**.

### Core loop & controls
- **Lowered camera (IDLE):** you see the shot list (left), the photo roll (right),
  and the **Raise Camera** + **Confirm** buttons.
- **Raise Camera** (button or **Space**): the world **zooms** so your view is limited
  to the camera frame — UI hides, focus on the shot.
- **While raised (AIMING):** move the mouse to look around, **left-click to shoot**.
  Keep shooting as much as you like — each shot's real photo flies into the roll on
  the right. **Space / right-click / Esc** lowers the camera.
- **Confirm** (only in IDLE, available any time): finalizes the level. The **result
  panel** then checks your roll and reveals which missions you actually captured —
  confirming early is the risk. One special character per level triggers a dialog the
  first time you photograph it (the camera lowers for the moment).

## How it's built (3-stream parallel layout)

`LevelScene.create()` only ever calls three entry points; systems talk **only**
through the shared `bus` using `EVENTS` names:

```
initCameraSystem(scene, bus, levelData)   // src/camera/   — viewfinder, shutter, preview
initLogicSystem(scene, bus, levelData)    // src/domain/   — scoring, missions, evaluator
initUISystem(scene, bus, levelData)       // src/ui/       — checklist, score, dialog
```

### FROZEN contract — do not change without telling the whole team
- `src/config/events.js` — the `EVENTS` names + the `CAPTURE_RESULT` shape.
- `src/config/gameConfig.js` — `CONFIG` (frame size, threshold, scoring, grades).

Changing these breaks every other stream. Treat them as the source of truth.

### Motion (`src/anim/motion.js`)
All animation is centralized as tween presets encoding the 12 principles.
**Asset-swap rule:** motion drives only transform props (x, y, scaleX, scaleY,
angle, alpha) on origin-(0.5,0.5) objects, normalized to each object's bounds.
Replacing a placeholder shape with a same-origin/same-bounds sprite needs **zero**
animation edits. No linear easing anywhere. Reduced-motion flag respected
(`prefers-reduced-motion` or `setReducedMotion(true)`).

## Folder ownership
```
src/config/  events.js, gameConfig.js        [frozen contract]
src/core/    EventBus.js, stateMachine.js     [shared]
src/anim/    motion.js                        [shared motion presets]
src/camera/  CameraTool, CameraIntro, CaptureFeedback, index.js
src/domain/  PhotoEvaluator, FramingScorer, MissionManager, ScoreManager, index.js
src/objects/ PhotoObject.js
src/data/    schema.md, levels/level1..3.json
src/ui/      HUD, MissionListUI, ScoreUI, DialogBox, index.js
src/scenes/  Boot, Preload, MainMenu, Level, Result, levels.js
tests/       framingScorer.test.js, photoEvaluator.test.js
```

## Swapping in real art
Placeholders are **basic shapes only**. To go real:
1. Load assets in `src/scenes/PreloadScene.js` (marked swap-in point).
2. Register `idleAnim` spritesheet animations there by the keys level data uses.
3. In `src/objects/PhotoObject.js`, replace the placeholder rectangle with the
   sprite at the same origin/bounds — motion needs no changes.
