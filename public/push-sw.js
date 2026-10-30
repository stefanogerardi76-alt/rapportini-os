// Gestione delle notifiche push — caricato dal service worker della PWA
// (vedi `workbox.importScripts: ["push-sw.js"]` in vite.config.js).

self.addEventListener("push", (event) => {
  let dati = {};
  try {
    dati = event.data ? event.data.json() : {};
  } catch (e) {
    dati = { body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(dati.title || "Rapportini OS", {
      body: dati.body || "Nuovo rapportino archiviato",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((finestre) => {
      for (const f of finestre) {
        if ("focus" in f) return f.focus();
      }
      return self.clients.openWindow("/");
    })
  );
});
