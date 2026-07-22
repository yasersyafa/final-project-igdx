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
  "decor": [                 // optional: ambient props for atmosphere — NOT missions, NOT scored
    { "id": "dec_palm", "name": "Palm Tree", "sprite": "palm", "idleAnim": "sway",
      "x": 120, "y": 360, "bbox": { "x": 90, "y": 250, "w": 60, "h": 220 } }
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
- `decor` is **optional** — ambient props rendered into the world for atmosphere.
  Same fields as an object **minus** `mission`/`isSpecial`/`dialog`. Decor is
  **excluded** from the shot list and from capture scoring (it fills the scene so it
  doesn't look empty; framing it does nothing). Render slightly recessed.
- Each level has **3–5 objects** (mission targets); add `decor` freely on top.
- **Exactly one** object has `isSpecial: true` and carries a `dialog`.
- `idleAnim` maps to a procedural motion preset name, not a spritesheet (for now):
  `"bob"`, `"breathe"`, or `"sway"`. Omit for a fully static object.
- `bbox` is the framing/scoring hit area in world pixels (top-left origin). Keep it
  consistent with `x,y` (typically centered on the object).
- `x,y` is the object **center** (sprites/shapes use origin 0.5, 0.5).

## Localization

The game is bilingual (English / Bahasa Indonesia), chosen in main menu →
Settings and persisted via `src/core/settings.js`. Two text sources:

- **UI chrome** (buttons, labels, HUD) → central locale tables
  `src/data/locales/en.json` + `id.json`, keyed. Read with `t('key', {param})`
  from `src/core/i18n.js`. `{param}` placeholders fill in (e.g. `hud.roll`).
- **Level content** (`cutscene`, `mission`, `dialog.speaker`, `dialog.lines`)
  → inline `{ "en": "...", "id": "..." }` objects in the level JSON. Read with
  `L(value)` from `src/core/i18n.js`.

`L()` also passes plain strings through unchanged, so proper nouns kept as plain
strings — object `name`, city `name`, `decor` labels — need no translation.
Add a language: extend `src/config/languages.js`, add its key to every locale
table entry, every inline `{en,id}` object, and `education.json`.

Example inline content:

```jsonc
"mission": { "en": "Frame the house ...", "id": "Bidik rumah ..." },
"dialog": {
  "speaker": { "en": "Guide", "id": "Pemandu" },
  "lines": [ { "en": "...", "id": "..." } ]
}
```

## Album field notes (education)

Educational text shown in the Album is kept **separate** from level data in
`src/data/education.json`, keyed by the object's `id`. This lets the notes be
edited (and translated) without touching gameplay JSON. Each entry maps a
language code to its text:

```jsonc
{
  "obj_bench": {
    "en": "A public bench ...",   // English field notes
    "id": "Bangku umum ..."       // Bahasa Indonesia
  }
}
```

- Only **mission objects** get notes; random snapshots show none.
- Language is a **global setting** (main menu → Settings), persisted via
  `src/core/settings.js`; the Album reads it on open. To add a language, add its
  code to `src/config/languages.js` and the matching key to every entry here.
- Missing language falls back to `en`; a missing entry shows just the photo.

