// Dev server with livereload: builds once, watches src/ + index.html, rebuilds
// on change, and pushes a reload over WebSocket to any connected browser tab.
import { watch } from "fs";
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
  ".wav": "audio/wav",
};

function ext(path) {
  const i = path.lastIndexOf(".");
  return i < 0 ? "" : path.slice(i);
}

async function build() {
  const result = await Bun.build({
    entrypoints: [join(ROOT, "src/main.js")],
    outdir: join(ROOT, "dist"),
    target: "browser",
  });
  if (!result.success) {
    console.error("Build failed:");
    for (const log of result.logs) console.error(log);
  }
  return result.success;
}

const LIVERELOAD_SNIPPET = `
<script>
(function () {
  function connect() {
    const ws = new WebSocket("ws://" + location.host + "/__livereload");
    ws.onmessage = (e) => { if (e.data === "reload") location.reload(); };
    ws.onclose = () => setTimeout(connect, 1000);
  }
  connect();
})();
</script>
</body>`;

const clients = new Set();
function broadcastReload() {
  for (const ws of clients) {
    try { ws.send("reload"); } catch {}
  }
}

const server = Bun.serve({
  port: PORT,
  async fetch(req, srv) {
    const url = new URL(req.url);
    if (url.pathname === "/__livereload") {
      return srv.upgrade(req) ? undefined : new Response("Upgrade failed", { status: 400 });
    }

    let path = decodeURIComponent(url.pathname);
    if (path === "/") path = "/index.html";
    const full = join(ROOT, normalize(path));
    if (!full.startsWith(ROOT)) return new Response("Forbidden", { status: 403 });

    const f = Bun.file(full);
    if (!(await f.exists())) return new Response("Not found", { status: 404 });

    if (full.endsWith(".html")) {
      const html = await f.text();
      return new Response(html.replace("</body>", LIVERELOAD_SNIPPET), {
        headers: { "Content-Type": "text/html" },
      });
    }
    return new Response(f, { headers: { "Content-Type": MIME[ext(full)] || "application/octet-stream" } });
  },
  websocket: {
    open(ws) { clients.add(ws); },
    close(ws) { clients.delete(ws); },
    message() {},
  },
});

let rebuildTimer = null;
function scheduleRebuild(label) {
  clearTimeout(rebuildTimer);
  rebuildTimer = setTimeout(async () => {
    console.log(`Change detected (${label}), rebuilding...`);
    const ok = await build();
    if (ok) {
      console.log("Rebuilt. Reloading browser.");
      broadcastReload();
    }
  }, 150);
}

watch(join(ROOT, "src"), { recursive: true }, (_event, filename) => scheduleRebuild(filename ?? "src"));
watch(join(ROOT, "index.html"), () => scheduleRebuild("index.html"));

await build();
console.log(`Photo Game dev server (livereload): http://localhost:${server.port}`);
