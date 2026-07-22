// Gallery persistence. Saves captured photos per level in localStorage as
// downscaled JPEG data URLs. Mirrors core/progress.js: all storage access is
// try/catch-guarded so the game still runs where localStorage is unavailable
// (private mode, bun test, etc.), and textureToDataURL no-ops without a DOM.

const KEY = 'photowalk.gallery';
const CAP = 12; // max saved photos kept per level (newest win; oldest dropped)

function storage() {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage;
  } catch { return null; }
}

// loadGallery -> { [levelId]: [ { id, dataUrl, objectId, ts } ] }
// objectId is the mission object a photo captured, or null/undefined for a
// random snapshot (no educational info shown for those in the album).
export function loadGallery() {
  const s = storage();
  if (!s) return {};
  try {
    const raw = s.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch { return {}; }
}

function saveGallery(data) {
  const s = storage();
  if (!s) return false;
  try { s.setItem(KEY, JSON.stringify(data)); return true; }
  catch { return false; }
}

// photosFor -> array of saved photos for a level (newest last), or [].
export function photosFor(levelId) {
  const list = loadGallery()[levelId];
  return Array.isArray(list) ? list : [];
}

export function hasPhotos(levelId) {
  return photosFor(levelId).length > 0;
}

// addPhoto — append a photo, cap per level (drop oldest). On quota failure,
// drop the oldest and retry once so a full store degrades gracefully.
export function addPhoto(levelId, { id, dataUrl, objectId = null }) {
  if (!dataUrl) return false;
  const data = loadGallery();
  const list = Array.isArray(data[levelId]) ? data[levelId] : [];
  list.push({ id, dataUrl, objectId, ts: Date.now() });
  while (list.length > CAP) list.shift();
  data[levelId] = list;
  if (saveGallery(data)) return true;
  // Over quota: drop oldest and retry once.
  if (list.length > 1) {
    list.shift();
    data[levelId] = list;
    return saveGallery(data);
  }
  return false;
}

// removePhoto — drop a photo by id (keeps gallery in sync with roll deletes).
export function removePhoto(levelId, id) {
  const data = loadGallery();
  const list = data[levelId];
  if (!Array.isArray(list)) return false;
  const i = list.findIndex((p) => p.id === id);
  if (i === -1) return false;
  list.splice(i, 1);
  if (list.length === 0) delete data[levelId];
  else data[levelId] = list;
  return saveGallery(data);
}

// textureToDataURL — read a Phaser texture's source image, downscale to maxW,
// and encode as a small JPEG data URL. Returns null without a DOM/canvas (tests).
export function textureToDataURL(scene, key, maxW = 240) {
  try {
    if (typeof document === 'undefined') return null;
    const tex = scene.textures.get(key);
    const src = tex && tex.getSourceImage && tex.getSourceImage();
    if (!src || !src.width) return null;
    const scale = Math.min(1, maxW / src.width);
    const w = Math.max(1, Math.round(src.width * scale));
    const h = Math.max(1, Math.round(src.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(src, 0, 0, w, h);
    return canvas.toDataURL('image/jpeg', 0.72);
  } catch { return null; }
}

export default { loadGallery, photosFor, hasPhotos, addPhoto, removePhoto, textureToDataURL };
