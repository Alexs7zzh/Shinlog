self.addEventListener('install', function() {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', function(event) {
  event.waitUntil(self.clients.claim())
})

addEventListener('fetch', function(event) {
  if (event.request.url.startsWith(self.location.origin)) {
    console.log(event)
    event.respondWith(async function() {
      if (/browser-sync/.test(event.request.url)) return fetch(event.request)
      
      const cachedResponse = await caches.match(event.request)
      if (cachedResponse) return cachedResponse
      
      const response = await fetch(event.request)
      const cache = await caches.open('cache')
      await cache.put(event.request, response.clone())
      
      return response
    }())
  }
})
