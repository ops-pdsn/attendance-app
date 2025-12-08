const CACHE_NAME = 'attendance-v1'

// Install - just activate immediately
self.addEventListener('install', (event) => {
  console.log('SW: Installing...')
  self.skipWaiting()
})

// Activate - claim clients
self.addEventListener('activate', (event) => {
  console.log('SW: Activating...')
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    }).then(() => self.clients.claim())
  )
})

// Fetch - network first, cache fallback for GET requests
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return
  
  // Skip API and auth requests
  const url = new URL(event.request.url)
  if (url.pathname.startsWith('/api/') || 
      url.pathname.startsWith('/auth/') ||
      url.pathname.includes('next-auth')) {
    return
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses
        if (response.status === 200 && response.type === 'basic') {
          const responseClone = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone)
          })
        }
        return response
      })
      .catch(() => {
        // Try cache on network failure
        return caches.match(event.request)
      })
  )
})