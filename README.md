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

Open http://localhost:3000

## How it's built (3-stream parallel layout)

`LevelScene.create()` only ever calls three entry points; systems talk **only**
through the shared `bus` using `EVENTS` names:

```
initCameraSystem(scene, bus, levelData)   // src/camera/  
initLogicSystem(scene, bus, levelData)    // src/domain/   
initUISystem(scene, bus, levelData)       // src/ui/      
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
