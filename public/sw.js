// Service Worker para Nexus Dock PWA y Notificaciones Móviles

const CACHE_NAME = 'nexus-dock-v1';

self.addEventListener('install', (event) => {
  // Activar inmediatamente sin esperar a que se cierren las pestañas
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Manejo de clic en una notificación
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Si la ventana ya está abierta, traerla al frente
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      // Si no hay ninguna ventana abierta, abrir la aplicación
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});

// Soporte para Notificaciones Web Push en segundo plano
self.addEventListener('push', (event) => {
  let data = {
    title: 'Nexus Dock | Alerta',
    body: 'Nueva actualización en el patio de maniobras.',
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    tag: 'nexus-dock-alert',
    vibrate: [200, 100, 200, 100, 200]
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/badge-72.png',
    vibrate: data.vibrate || [500, 200, 500, 200, 500],
    tag: data.tag || 'nexus-dock-notification',
    renotify: true,
    silent: false,
    requireInteraction: true,
    data: data.url || '/'
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Recepción de mensajes desde la app para emitir notificaciones locales vía SW
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    self.registration.showNotification(title, {
      icon: '/icon-192.png',
      badge: '/badge-72.png',
      silent: false,
      requireInteraction: true,
      vibrate: [500, 200, 500, 200, 500],
      ...options
    });
  }
});
