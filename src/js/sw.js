self.addEventListener('install', function() {
  self.skipWaiting()
})

addEventListener('activate', function(event) {
  event.waitUntil(async function() {
    if (self.registration.navigationPreload)
      await self.registration.navigationPreload.enable()
  }())
})

addEventListener('fetch', function(event) {
  event.respondWith(async function() {
    if (/browser-sync/.test(event.request.url)) return fetch(event.request)
    if (/plausible/.test(event.request.url)) return fetch(event.request)
    
    const cachedResponse = await caches.match(event.request)
    if (cachedResponse) return cachedResponse
    
    const preloadResponse = await event.preloadResponse
    if (preloadResponse) return preloadResponse
    
    return fetch(event.request).then(function(response) {
      caches.open('cache').then(function(cache) {
        cache.put(event.request, response.clone())
        return response
      })
    })
    
  }())
})
