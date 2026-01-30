self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", () => {
  self.clients.claim();
});

// 🔔 Background notification logic
self.addEventListener("sync", async (event) => {
  if (event.tag === "attendance-reminder") {
    event.waitUntil(showReminder());
  }
});

async function showReminder() {
  const clients = await self.clients.matchAll({ type: "window" });

  // If app is already open, don't notify
  if (clients.length > 0) return;

  self.registration.showNotification("Attendance Reminder", {
    body: "It’s after 6 PM. Don’t forget to mark today’s attendance.",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
  });
}
