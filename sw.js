/* 启程 · Service Worker（仅本地内测：http/https 下注册）
   策略：导航与代码类资源（html/css/js/manifest）走「网络优先」，保证内测改动立刻生效；
        图片/图标走「缓存优先」；两者在断网时都回退到缓存。
   缓存名带版本号，发版时改 CACHE 版本即可整体替换。 */
const CACHE = "qicheng-shell-v5";
const ASSETS = [
  "./",
  "./index.html",
  "./assets/css/app.css",
  "./assets/js/parts/01-core.js",
  "./assets/js/parts/02-data.js",
  "./assets/js/parts/03-search.js",
  "./assets/js/parts/04-ui.js",
  "./assets/js/parts/05-jobs.js",
  "./assets/js/parts/06-resume.js",
  "./assets/js/parts/07-import.js",
  "./assets/js/parts/08-match.js",
  "./assets/js/parts/09-ai.js",
  "./assets/js/parts/10-settings.js",
  "./assets/js/parts/11-keyvault.js",
  "./assets/js/parts/12-interview.js",
  "./assets/js/parts/13-reverse.js",
  "./assets/js/parts/14-board.js",
  "./assets/js/parts/15-tailor.js",
  "./assets/js/parts/16-boot.js",
  "./manifest.webmanifest",
  "./assets/icons/qicheng.svg",
  "./assets/icons/qicheng-192.png",
  "./assets/icons/qicheng-512.png",
  "./assets/img/greet-banner.jpg"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.allSettled(ASSETS.map(u => c.add(new Request(u, { cache: "reload" })))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const isCode = req.mode === "navigate" || /\.(?:html|css|js|webmanifest)$/i.test(url.pathname) || url.pathname.endsWith("/");

  if (isCode) {
    e.respondWith(
      fetch(req).then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() =>
        caches.match(req, { ignoreSearch: true }).then(hit =>
          hit || (req.mode === "navigate" ? caches.match("./index.html", { ignoreSearch: true }) : null)
        )
      )
    );
    return;
  }

  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(hit => {
      if (hit) return hit;
      return fetch(req).then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      });
    })
  );
});
