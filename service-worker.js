/*
 * Service Worker — Radar Vacinal ACS
 * Estratégia:
 *  - App shell + assets locais pré-cacheados (funciona offline).
 *  - Navegação (index.html): network-first -> quando online, pega a versão nova;
 *    offline, cai para o cache. Assim o cache NÃO congela a base clínica: uma nova
 *    versão publicada é detectada assim que há internet.
 *  - Demais assets locais: stale-while-revalidate (rápido, mas atualiza em segundo plano).
 *  - A partir da 2.1.2, uma nova versão válida ativa automaticamente após o precache.
 *    Isso evita PWAs instalados presos indefinidamente em uma versão antiga.
 *
 * IMPORTANTE: ao publicar mudança de app OU de base vacinal, atualize CACHE_VERSION.
 */
const CACHE_VERSION = 'radar-acs-v2.1.4-2026.09.15';

const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './logo-radar-acs1.png',
  './data/vaccine-calendar-2026.js',
  './js/engine.js',
  './js/engine-core.js',
  './js/engine-release-patch.js',
  './vendor/tailwind.build.css',
  './vendor/lucide.min.js',
  './vendor/html2pdf.bundle.min.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png'
];

self.addEventListener('install', (event) => {
  // Só ativa a nova versão depois que todo o app shell crítico foi salvo com sucesso.
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
      .catch((err) => {
        console.error('[Radar SW] Falha no precache de assets críticos:', err);
        throw err;
      })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Compatibilidade com clientes antigos que ainda enviem a ação manual de atualização.
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
