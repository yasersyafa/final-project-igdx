# Level JSON schema

Each level file lives in `src/data/levels/levelN.json`.

```jsonc
{
  "id": "level1",            // unique level id
  "name": "Morning in the Park", // display name
  "background": "bg_park",   // texture key loaded in PreloadScene (placeholder for now)
  "bgColor": "#8fae6b",      // flat fallback color drawn until real bg art exists
  "cutscene": [              // optional: cinematic intro cards (CutsceneScene), one string per card
    "Morning settles over the park.",
    "Find the small moments before the dew lifts."
  ],
  "objects": [
    {
      "id": "obj_bench",     // unique within the level
      "name": "Wooden Bench",// label shown on the placeholder shape
      "sprite": "bench",     // texture/atlas key (placeholder shape for now)
      "idleAnim": "sway",    // preset name: "bob" | "breathe" | "sway"  (omit for static)
      "x": 300, "y": 470,    // placement in scene (object CENTER)
      "bbox": { "x": 240, "y": 425, "w": 120, "h": 90 }, // hit area for framing math (top-left origin)
      "mission": "Photograph a place to sit", // omit if the object is not a mission target
      "isSpecial": false     // exactly ONE object per level is true
    },
    {
      "id": "obj_cat",
      "name": "Sleeping Cat",
      "sprite": "cat",
      "idleAnim": "breathe",
      "x": 520, "y": 560,
      "bbox": { "x": 475, "y": 525, "w": 90, "h": 70 },
      "mission": "Find the napping resident",
      "isSpecial": true,     // the special object triggers dialog
      "dialog": {
        "speaker": "Narrator",
        "lines": ["...", "..."]   // 2-4 short cozy lines
      }
    }
  ]
}
```

## Rules
- `cutscene` is **optional** — an array of card strings shown before the level
  (`"\n"` allowed for a two-line card). Omit or leave empty to skip straight in.
- Each level has **3–5 objects**.
- **Exactly one** object has `isSpecial: true` and carries a `dialog`.
- `idleAnim` maps to a procedural motion preset name, not a spritesheet (for now):
  `"bob"`, `"breathe"`, or `"sway"`. Omit for a fully static object.
- `bbox` is the framing/scoring hit area in world pixels (top-left origin). Keep it
  consistent with `x,y` (typically centered on the object).
- `x,y` is the object **center** (sprites/shapes use origin 0.5, 0.5).
