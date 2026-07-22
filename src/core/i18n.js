// Localization runtime. Two ways to get localized text, both reading the current
// language from the global Settings (core/settings.js):
//
//   t('key', { n: 3 })  — look a UI string up in the locale tables
//                         (src/data/locales/<lang>.json), with {param} fill-ins.
//   L(value)            — resolve an inline localized value from content JSON:
//                         a { en, id } object, or a plain string (passed through).
//
// Both fall back to the default language, then to something safe, so a missing
// translation degrades instead of crashing.
import { getLang } from "./settings.js";
import { DEFAULT_LANG } from "../config/languages.js";
import en from "../data/locales/en.json";
import id from "../data/locales/id.json";

const TABLES = { en, id };

function table(lang) {
  return TABLES[lang] || TABLES[DEFAULT_LANG] || {};
}

// t — UI string by key, with optional {param} substitution.
export function t(key, params) {
  const lang = getLang();
  let s = table(lang)[key];
  if (s == null) s = table(DEFAULT_LANG)[key];
  if (s == null) {
    console.warn(`[i18n] missing key: ${key}`);
    s = key;
  }
  if (params) {
    for (const k of Object.keys(params)) {
      s = s.split(`{${k}}`).join(String(params[k]));
    }
  }
  return s;
}

// L — resolve an inline localized value. Accepts a { en, id } object or a plain
// string (returned as-is, so untranslated proper nouns like city names just work).
export function L(value) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  return value[getLang()] ?? value[DEFAULT_LANG] ?? "";
}

export default { t, L };
