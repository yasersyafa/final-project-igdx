// Simple static file server for dev. Bun toolchain only; game runs in browser.
import { file } from "bun";
import { join, normalize } from "path";

const ROOT = import.meta.dir;
const PORT = 3000;

const MIME = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
};

function ext(path) {
  const i = path.lastIndexOf(".");
  return i < 0 ? "" : path.slice(i);
}

Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    let path = decodeURIComponent(url.pathname);
    if (path === "/") path = "/index.html";
    const full = join(ROOT, normalize(path));
    if (!full.startsWith(ROOT)) return new Response("Forbidden", { status: 403 });
    const f = file(full);
    if (!(await f.exists())) return new Response("Not found", { status: 404 });
    return new Response(f, {
      headers: { "Content-Type": MIME[ext(full)] || "application/octet-stream" },
    });
  },
});

console.log(`Photo Game dev server: http://localhost:${PORT}`);
