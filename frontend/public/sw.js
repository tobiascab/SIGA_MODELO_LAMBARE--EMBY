const CACHE_NAME = 'siga-pwa-v2';
const STATIC_ASSETS = [
    '/logo.png',
    '/logo-cooperativa.png',
    '/manifest.json'
];

// Instalación - Cachear recursos estáticos
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Cacheando recursos estáticos');
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

// Activación - Limpiar caches antiguos
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        })
    );
    self.clients.claim();
});

// Fetch - Estrategia Network First con fallback a cache
self.addEventListener('fetch', (event) => {
    // Ignorar requests que no sean GET
    if (event.request.method !== 'GET') return;

    // Ignorar requests a APIs (siempre ir a red)
    if (event.request.url.includes('/api/')) return;

    // No cachear archivos de Next.js (chunks JS/CSS) - siempre frescos del servidor
    if (event.request.url.includes('/_next/')) return;

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Clonar response para guardar en cache
                const responseClone = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    // Solo cachear responses exitosos y de nuestro dominio
                    if (response.status === 200 && event.request.url.startsWith(self.location.origin)) {
                        cache.put(event.request, responseClone);
                    }
                });
                return response;
            })
            .catch(() => {
                // Si falla la red, intentar servir desde cache
                return caches.match(event.request).then((cachedResponse) => {
                    if (cachedResponse) {
                        return cachedResponse;
                    }
                    // Si no hay cache, mostrar página offline básica para navegaciones
                    if (event.request.mode === 'navigate') {
                        return caches.match('/');
                    }
                    return new Response('Offline', { status: 503 });
                });
            })
    );
});

// Push Notifications
self.addEventListener('push', function (event) {
    if (event.data) {
        try {
            const data = event.data.json();
            const options = {
                body: data.body,
                icon: data.icon || '/logo.png',
                badge: '/logo.png',
                image: data.image || '/images/notification-banner.jpg',
                vibrate: [200, 100, 200],
                tag: 'siga-notification-' + (data.tag || Date.now()),
                renotify: true,
                data: {
                    dateOfArrival: Date.now(),
                    url: data.data?.url || data.url || '/dashboard'
                },
                actions: [
                    { action: 'open', title: 'Ver ahora' }
                ]
            };
            event.waitUntil(
                self.registration.showNotification(data.title, options)
            );
        } catch (e) {
            console.error('[SW] Error parseando data de push:', e);
            // Fallback para texto plano
            const text = event.data.text();
            event.waitUntil(
                self.registration.showNotification('SIGA - Notificación', {
                    body: text,
                    icon: '/logo.png'
                })
            );
        }
    }
});

// Click en notificación
self.addEventListener('notificationclick', function (event) {
    event.notification.close();

    const urlToOpen = event.notification.data?.url || '/dashboard';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                // 1. Si hay alguna ventana abierta en nuestro dominio, enfocarla y navegar
                for (const client of clientList) {
                    if (client.url.includes(self.location.origin) && 'focus' in client) {
                        client.navigate(urlToOpen);
                        return client.focus();
                    }
                }
                // 2. Si no hay ventana, abrir una nueva
                return clients.openWindow(urlToOpen);
            })
    );
});
