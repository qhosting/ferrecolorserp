
// Service Worker para funcionalidad offline
const CACHE_NAME = 'erp-cobranza-v1';
const urlsToCache = [
  '/',
  '/cobranza',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json'
];

// Instalación del service worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache abierto');
        return cache.addAll(urlsToCache);
      })
  );
});

// Interceptar peticiones de red
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Devolver del cache si existe
        if (response) {
          return response;
        }

        return fetch(event.request).then(
          (response) => {
            // Verificar que la respuesta sea válida
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clonar la respuesta
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        ).catch(() => {
          // Si falla la red y no está en cache, mostrar página offline
          if (event.request.destination === 'document') {
            return caches.match('/offline.html');
          }
        });
      })
  );
});

// Actualización del service worker
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Manejar mensajes del cliente
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Sincronización en segundo plano
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-pagos') {
    event.waitUntil(syncPagos());
  }
});

async function syncPagos() {
  try {
    // Abrir IndexedDB para obtener pagos pendientes
    const request = indexedDB.open('ERPOfflineDB', 1);
    
    request.onsuccess = async (event) => {
      const db = event.target.result;
      const transaction = db.transaction(['pendingSync'], 'readonly');
      const store = transaction.objectStore('pendingSync');
      
      const getRequest = store.getAll();
      getRequest.onsuccess = async () => {
        const pendingItems = getRequest.result;
        
        for (const item of pendingItems) {
          if (item.type === 'pago') {
            try {
              const response = await fetch('/api/pagos/sync', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(item.data),
              });
              
              if (response.ok) {
                // Remover item de la cola de sincronización
                const deleteTransaction = db.transaction(['pendingSync'], 'readwrite');
                const deleteStore = deleteTransaction.objectStore('pendingSync');
                deleteStore.delete(item.id);
              }
            } catch (error) {
              console.error('Error sincronizando pago:', error);
            }
          }
        }
      };
    };
  } catch (error) {
    console.error('Error en sincronización de fondo:', error);
  }
}
