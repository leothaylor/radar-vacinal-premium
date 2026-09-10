/*
 * Service Worker — Radar Vacinal ACS
 * Estratégia:
 *  - App shell + assets locais pré-cacheados (funciona offline).
 *  - Navegação (index.html): network-first -> quando online, pega a versão nova;
 *    offline, cai para o cache. Assim o cache NÃO congela a base clínica: uma nova
 *    versão publicada é detectada assim que há internet.
 *  - Demais assets locais: stale-while-revalidate (rápido, mas atualiza em segundo plano).
 *  - Uma nova versão do SW NÃO ativa sozinha no meio de uma ação: espera o usuário
 *    tocar em "Atualizar" (mensagem SKIP_WAITING).
 *
 * IMPORTANTE: ao publicar mudança de app OU de base vacinal, atualize CACHE_VERSION.
 */
const CACHE_VERSION = 'radar-acs-v2.0.0-2026.09.09';

const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './logo-radar-acs1.png',
  './data/vaccine-calendar-2026.js',
  './js/engine.js',
  './vendor/tailwind.build.css',
  './vendor/lucide.min.js',
  './vendor/html2pdf.bundle.min.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png'
];

self.addEventListener('install', (event) => {
  // Não chama skipWaiting: a nova versão aguarda confirmação do usuário.
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(CORE_ASSETS)).catch(() => {})
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // cross-origin (fontes): deixa passar direto

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => { const copy = res.clone(); caches.open(CACHE_VERSION).then((c) => c.put(req, copy)); return res; })
        .catch(() => caches.match(req).then((r) => r || caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => { const copy = res.clone(); caches.open(CACHE_VERSION).then((c) => c.put(req, copy)); return res; })
        .catch(() => cached);
      return cached || network;
    })
  );
});
