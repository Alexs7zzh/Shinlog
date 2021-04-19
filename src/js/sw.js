self.addEventListener('install', function() {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', function(event) {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', function(event) {
  if (event.request.url.startsWith(self.location.origin) && !/browser-sync/.test(event.request.url)) {
    console.log(event)
    event.respondWith(async function() {
      const cachedResponse = await caches.match(event.request)
      if (cachedResponse) return cachedResponse
      
      const response = await fetch(event.request)
      const cache = await caches.open('cache')
      await cache.put(event.request, response.clone())
      
      return response
    }())
  }
})
