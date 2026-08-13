// Cozy pastel theme for "chrome" scenes — main menu, level select, result,
// album, and the dialogs opened from them (Settings, level info). In-level HUD
// (ControlBar, MissionListUI, ScoreUI, PhotoStrip, CameraTool, ConfirmDialog —
// shared with in-level warnings/deletes) intentionally stays on its original
// dark panels: level art backgrounds are already bright, so a dark HUD is what
// keeps text legible over them. Cutscene stays dark too (cinematic letterbox).
export const THEME = {
  bg: "#FFE4E9", // pale pink — scene background
  panel: "#FEF2C4", // pale cream — dialog/card panel fill
  panelBorder: 0xdac08d, // dark tan — panel stroke
  ink: "#65463D", // warm dark brown — primary text
  muted: "#BA9075", // muted tan — secondary text / hints

  play: 0x78b492, // dark green
  playLocked: 0xf7c3ce, // dark pink
  tutorial: 0x97b272, // dark olive
  album: 0x77a5bd, // dark blue
  settings: 0xdac08d, // dark tan
  danger: 0xc06060, // destructive actions (delete/reset) — outside the palette on purpose
};

export default THEME;
