self.addEventListener('install', function(event) {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', function(event) {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', function(event) {
  if (event.request.url.startsWith(self.location.origin) && !event.request.url.endsWith('/'))
    event.respondWith(async function() {
      const cachedResponse = await caches.match(event.request)
      if (cachedResponse) return cachedResponse
      
      const response = await fetch(event.request)
      const cache = await caches.open('cache')
      await cache.put(event.request, response.clone())
      
      return response
    }())
})
