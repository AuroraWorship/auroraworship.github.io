/**
 * Service worker de Aurora Worship.
 *
 * Escrito a mano y sin dependencias: la aplicación es un estático pequeño y
 * no necesita un generador de bundles de caché para funcionar sin conexión.
 *
 * Dos estrategias, según lo que se pida:
 *  - Navegación: red primero, y si no hay red se sirve la aplicación cacheada.
 *    Así una versión nueva se recoge en cuanto haya conexión.
 *  - Recursos (JS, CSS, iconos): se sirve lo cacheado al instante y se
 *    refresca por detrás. Abrir la app en el atril no debe esperar a la red.
 *
 * Los datos del ministerio NO pasan por aquí: viven en IndexedDB, que ya
 * funciona sin conexión por su cuenta.
 */

const VERSION = 'aurora-v1';
const SHELL = `${VERSION}-shell`;

// `self.registration.scope` termina en la ruta base real, sea "/" o "/repo/".
const BASE = new URL(self.registration.scope).pathname;

const PRECACHE = [BASE, `${BASE}manifest.webmanifest`, `${BASE}favicon.svg`];

/**
 * Averigua el JS y el CSS con los que arranca la aplicación.
 *
 * Sus nombres llevan un hash que cambia en cada compilación, así que no se
 * pueden escribir aquí a mano: se leen del propio index.html.
 *
 * Hacerlo desde el worker y no desde la página evita una carrera real —
 * `clients.claim()` toma el control de forma asíncrona, y una página que pida
 * sus recursos antes de estar controlada no los mete en esta caché. Sin esto,
 * abrir la aplicación sin conexión dependía de la caché HTTP del navegador,
 * que puede vaciarse.
 */
async function shellAssets() {
  try {
    const respuesta = await fetch(BASE, { cache: 'no-cache' });
    const html = await respuesta.text();
    return [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)].map(
      (m) => new URL(m[1], self.registration.scope).href,
    );
  } catch {
    return [];
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL);
      // Un fallo al precachear no debe impedir la instalación: la estrategia
      // de tiempo de ejecución acabará llenando la caché igualmente.
      await cache.addAll([...PRECACHE, ...(await shellAssets())]).catch(() => undefined);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => !key.startsWith(VERSION)).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          void caches.open(SHELL).then((cache) => cache.put(BASE, copy));
          return response;
        })
        .catch(() => caches.match(BASE).then((cached) => cached ?? Response.error())),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            void caches.open(SHELL).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached ?? Response.error());
      return cached ?? network;
    }),
  );
});
