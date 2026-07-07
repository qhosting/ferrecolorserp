const CACHE_NAME = 'vertexerp-cache-v1';
const OFFLINE_URL = '/offline.html';

// Recursos esenciales que se pre-cachean inmediatamente
const STATIC_ASSETS = [
  OFFLINE_URL,
  '/manifest.json',
  '/icons/PWA-192.png',
  '/icons/PWA-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-cacheando recursos offline');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Eliminando caché antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Interceptar peticiones de red de forma inteligente
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. IGNORAR COMPLETAMENTE:
  // - Peticiones no GET (POST, PUT, DELETE, etc.)
  // - Rutas del API (/api/*) y NextAuth (/api/auth/*)
  // - Hot Module Replacement en desarrollo (webpack-hmr, next-dev)
  if (
    request.method !== 'GET' ||
    url.pathname.startsWith('/api/') ||
    url.pathname.includes('webpack-hmr') ||
    url.pathname.includes('/_next/webpack-hmr') ||
    url.pathname.startsWith('/_next/data/') ||
    url.searchParams.has('_next')
  ) {
    return; // Dejar que vayan directo a la red sin intervenir
  }

  // 2. Estrategia para Navegación de Páginas HTML (Documentos)
  // Network-First: Intentar cargar la página fresca del servidor, si falla ir a caché o mostrar offline.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Guardar copia en el caché para uso offline
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // Si falla, intentar devolver la página del caché
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Si no hay versión en caché, mostrar la pantalla offline estática
            return caches.match(OFFLINE_URL);
          });
        })
    );
    return;
  }

  // 3. Estrategia para Recursos Estáticos (Assets: CSS, JS, imágenes, fuentes)
  // Stale-While-Revalidate: Servir de caché instantáneamente, y actualizar de fondo
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Ejecutar fetch de fondo para actualizar el caché
        fetch(request)
          .then((networkResponse) => {
            if (networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, networkResponse);
              });
            }
          })
          .catch(() => {/* Ignorar errores silenciosamente */});
        return cachedResponse;
      }

      // Si no está en caché, ir a la red y guardar en caché para la próxima vez
      return fetch(request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200) {
          return networkResponse;
        }
        const responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseClone);
        });
        return networkResponse;
      });
    })
  );
});

// Sincronización en segundo plano (Background Sync) para pagos y ventas
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-offline-data') {
    event.waitUntil(syncOfflineData());
  }
});

async function syncOfflineData() {
  console.log('[SW] Iniciando sincronización de fondo...');
  try {
    const request = indexedDB.open('ERPOfflineDB', 1);
    request.onsuccess = async (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pendingSync')) return;

      const transaction = db.transaction(['pendingSync'], 'readwrite');
      const store = transaction.objectStore('pendingSync');
      
      const getRequest = store.getAll();
      getRequest.onsuccess = async () => {
        const pendingItems = getRequest.result;
        for (const item of pendingItems) {
          try {
            let endpoint = '/api/pagos/sync';
            if (item.type === 'venta') {
              endpoint = '/api/pos/venta'; // Endpoint POS
            }

            const response = await fetch(endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(item.data),
            });

            if (response.ok) {
              // Borrar elemento procesado exitosamente
              const deleteTx = db.transaction(['pendingSync'], 'readwrite');
              deleteTx.objectStore('pendingSync').delete(item.id);
            }
          } catch (err) {
            console.error('[SW] Fallo al sincronizar elemento:', item.id, err);
          }
        }
      };
    };
  } catch (error) {
    console.error('[SW] Error en sincronización de fondo:', error);
  }
}
