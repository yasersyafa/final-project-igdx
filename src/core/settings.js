// Global player settings, persisted in localStorage. Currently holds the chosen
// language — the single source of truth read by the Album (and any future
// localized UI). Mirrors core/gallery.js: all storage access is try/catch-guarded
// so the game still runs where localStorage is unavailable (private mode, tests).
import { LANGUAGES, DEFAULT_LANG } from "../config/languages.js";
import { bus } from "./EventBus.js";
import { EVENTS } from "../config/events.js";

const KEY = "photowalk.settings";

function storage() {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage;
  } catch {
    return null;
  }
}

export function loadSettings() {
  const s = storage();
  if (!s) return {};
  try {
    const raw = s.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveSettings(data) {
  const s = storage();
  if (!s) return false;
  try {
    s.setItem(KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

// getLang -> a valid language code, falling back to the default for a missing or
// unknown stored value.
export function getLang() {
  const code = loadSettings().lang;
  return LANGUAGES.some((l) => l.code === code) ? code : DEFAULT_LANG;
}

// setLang -> persist a language choice. Ignores unknown codes.
export function setLang(code) {
  if (!LANGUAGES.some((l) => l.code === code)) return false;
  const data = loadSettings();
  data.lang = code;
  const ok = saveSettings(data);
  if (ok) bus.emit(EVENTS.LANG_CHANGED, code);
  return ok;
}

// hasSeenTutorial / markTutorialSeen -> tracks whether the player has been
// through TutorialScene at least once. Gates the Main Menu's Play button
// (see src/scenes/MainMenuScene.js) until it's true.
export function hasSeenTutorial() {
  return !!loadSettings().tutorialSeen;
}

export function markTutorialSeen() {
  const data = loadSettings();
  data.tutorialSeen = true;
  return saveSettings(data);
}

const SIDES = ['left', 'right'];
const DEFAULT_SIDE = 'right';

// getSidebarSide / setSidebarSide -> which screen edge the shot-list/roll
// drawer docks to (src/ui/Sidebar.js), read once per scene at construction —
// there's no live-update path since Settings is only reachable from the Main
// Menu, never mid-level. Falls back to the default for a missing/bad value.
export function getSidebarSide() {
  const side = loadSettings().sidebarSide;
  return SIDES.includes(side) ? side : DEFAULT_SIDE;
}

export function setSidebarSide(side) {
  if (!SIDES.includes(side)) return false;
  const data = loadSettings();
  data.sidebarSide = side;
  return saveSettings(data);
}

export default {
  loadSettings, getLang, setLang, hasSeenTutorial, markTutorialSeen,
  getSidebarSide, setSidebarSide,
};
