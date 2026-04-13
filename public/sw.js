// Bethel Divine Healthcare — Service Worker
// Handles web push notification display

self.addEventListener("push", function (event) {
  if (!event.data) return;

  let data = {};
  try {
    data = event.data.json();
  } catch {
    data = { title: "Bethel Divine", message: event.data.text(), url: "/" };
  }

  const title = data.title || "Bethel Divine Healthcare";
  const options = {
    body: data.message || "",
    icon: "/logo-icon.png",
    badge: "/logo-icon.png",
    data: { url: data.url || "/" },
    requireInteraction: false,
    tag: "bethel-divine-notification",
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(function (windowClients) {
        for (const client of windowClients) {
          if (client.url === url && "focus" in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});
