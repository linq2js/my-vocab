/**
 * MyVocab PWA Service Worker
 * 
 * Handles caching strategies for offline support:
 * - Cache-first for static assets (JS, CSS, images, fonts)
 * - Network-first for API calls with offline fallback
 * - Automatic cache cleanup on version updates
 * 
 * @version 1.0.0
 */

// Cache configuration
const CACHE_VERSION = 'v1';
const STATIC_CACHE_NAME = `myvocab-static-${CACHE_VERSION}`;
const API_CACHE_NAME = `myvocab-api-${CACHE_VERSION}`;
const CACHE_NAMES = [STATIC_CACHE_NAME, API_CACHE_NAME];

// Static assets to pre-cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// File extensions that should use cache-first strategy
const STATIC_ASSET_EXTENSIONS = [
  '.js',
  '.css',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
  '.svg',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.ico',
];

// API endpoints that should use network-first with caching
const API_PATTERNS = [
  '/api/',
];

// Maximum age for API cache entries (24 hours in milliseconds)
const API_CACHE_MAX_AGE = 24 * 60 * 60 * 1000;

// Maximum number of API cache entries
const API_CACHE_MAX_ENTRIES = 100;

/**
 * Install event - pre-cache static assets
 * Uses skipWaiting() to activate immediately
 */
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Install - version:', CACHE_VERSION);
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('[ServiceWorker] Pre-caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[ServiceWorker] Skip waiting to activate immediately');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[ServiceWorker] Pre-cache failed:', error);
      })
  );
});

/**
 * Activate event - clean up old caches
 * Removes any caches that don't match current version
 */
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activate - cleaning up old caches');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              // Delete caches that start with 'myvocab-' but aren't in our current list
              return cacheName.startsWith('myvocab-') && !CACHE_NAMES.includes(cacheName);
            })
            .map((cacheName) => {
              console.log('[ServiceWorker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        // Clean up expired API cache entries
        return cleanupApiCache();
      })
      .then(() => {
        console.log('[ServiceWorker] Claiming all clients');
        return self.clients.claim();
      })
      .catch((error) => {
        console.error('[ServiceWorker] Activation failed:', error);
      })
  );
});

/**
 * Fetch event - route requests to appropriate caching strategy
 * 
 * Strategies:
 * - Static assets: Cache-first (fast, offline-capable)
 * - API calls: Network-first with cache fallback
 * - Navigation: Network-first with offline fallback
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests (POST, PUT, DELETE, etc.)
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip chrome-extension and other non-http(s) schemes
  if (!url.protocol.startsWith('http')) {
    return;
  }
  
  // Handle cross-origin API requests (OpenAI, Gemini, etc.)
  if (url.origin !== location.origin) {
    // Don't cache external API calls - they require fresh auth tokens
    return;
  }
  
  // Determine caching strategy based on request type
  if (isStaticAsset(url)) {
    // Static assets: Cache-first for speed
    event.respondWith(cacheFirst(request, STATIC_CACHE_NAME));
    return;
  }
  
  if (isApiRequest(url)) {
    // API calls: Network-first with cache fallback for offline
    event.respondWith(networkFirstWithCache(request, API_CACHE_NAME));
    return;
  }
  
  // Navigation and other requests: Network-first
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, STATIC_CACHE_NAME));
    return;
  }
  
  // Default: Cache-first for same-origin requests
  event.respondWith(cacheFirst(request, STATIC_CACHE_NAME));
});

/**
 * Check if URL is a static asset based on file extension
 * @param {URL} url - The URL to check
 * @returns {boolean} True if URL is a static asset
 */
function isStaticAsset(url) {
  const pathname = url.pathname.toLowerCase();
  return STATIC_ASSET_EXTENSIONS.some((ext) => pathname.endsWith(ext));
}

/**
 * Check if URL is an API request
 * @param {URL} url - The URL to check
 * @returns {boolean} True if URL is an API request
 */
function isApiRequest(url) {
  return API_PATTERNS.some((pattern) => url.pathname.startsWith(pattern));
}

/**
 * Cache-first strategy
 * Returns cached response if available, otherwise fetches from network and caches
 * Best for static assets that don't change frequently
 * 
 * @param {Request} request - The fetch request
 * @param {string} cacheName - Name of the cache to use
 * @returns {Promise<Response>} The response
 */
async function cacheFirst(request, cacheName) {
  try {
    // Check cache first
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      // Return cached response immediately
      // Optionally update cache in background (stale-while-revalidate)
      updateCacheInBackground(request, cacheName);
      return cachedResponse;
    }
    
    // Not in cache, fetch from network
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[ServiceWorker] Cache-first failed:', error);
    
    // Try to return cached response as fallback
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline fallback for navigation requests
    return caches.match('/');
  }
}

/**
 * Network-first strategy
 * Tries network first, falls back to cache if offline
 * Best for navigation requests and frequently updated content
 * 
 * @param {Request} request - The fetch request
 * @param {string} cacheName - Name of the cache to use
 * @returns {Promise<Response>} The response
 */
async function networkFirst(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[ServiceWorker] Network failed, trying cache:', request.url);
    
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline fallback for navigation
    return caches.match('/');
  }
}

/**
 * Network-first strategy with API-specific caching
 * Includes cache metadata for expiration and cleanup
 * Best for API calls that should work offline
 * 
 * @param {Request} request - The fetch request
 * @param {string} cacheName - Name of the cache to use
 * @returns {Promise<Response>} The response
 */
async function networkFirstWithCache(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Clone response before caching
      const responseToCache = networkResponse.clone();
      
      // Add timestamp header for cache expiration
      const cache = await caches.open(cacheName);
      const headers = new Headers(responseToCache.headers);
      headers.set('sw-cache-timestamp', Date.now().toString());
      
      const cachedResponse = new Response(await responseToCache.blob(), {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers: headers,
      });
      
      cache.put(request, cachedResponse);
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[ServiceWorker] API network failed, trying cache:', request.url);
    
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      // Check if cache entry is expired
      const timestamp = cachedResponse.headers.get('sw-cache-timestamp');
      if (timestamp) {
        const age = Date.now() - parseInt(timestamp, 10);
        if (age > API_CACHE_MAX_AGE) {
          console.log('[ServiceWorker] API cache expired:', request.url);
          // Return expired cache anyway (better than nothing when offline)
          // but mark it as stale
        }
      }
      return cachedResponse;
    }
    
    // Return error response for API calls
    return new Response(
      JSON.stringify({ error: 'Offline', message: 'No cached data available' }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Update cache in background (stale-while-revalidate pattern)
 * Fetches fresh content without blocking the response
 * 
 * @param {Request} request - The fetch request
 * @param {string} cacheName - Name of the cache to use
 */
function updateCacheInBackground(request, cacheName) {
  fetch(request)
    .then((response) => {
      if (response.ok) {
        caches.open(cacheName).then((cache) => {
          cache.put(request, response);
        });
      }
    })
    .catch(() => {
      // Silently fail - background update is best-effort
    });
}

/**
 * Clean up expired API cache entries
 * Removes entries older than API_CACHE_MAX_AGE and limits total entries
 * 
 * @returns {Promise<void>}
 */
async function cleanupApiCache() {
  try {
    const cache = await caches.open(API_CACHE_NAME);
    const requests = await cache.keys();
    
    console.log('[ServiceWorker] Cleaning up API cache, entries:', requests.length);
    
    const now = Date.now();
    const entries = [];
    
    // Collect entries with their timestamps
    for (const request of requests) {
      const response = await cache.match(request);
      if (response) {
        const timestamp = response.headers.get('sw-cache-timestamp');
        entries.push({
          request,
          timestamp: timestamp ? parseInt(timestamp, 10) : 0,
        });
      }
    }
    
    // Sort by timestamp (oldest first)
    entries.sort((a, b) => a.timestamp - b.timestamp);
    
    // Remove expired entries
    const expiredEntries = entries.filter((entry) => {
      return now - entry.timestamp > API_CACHE_MAX_AGE;
    });
    
    for (const entry of expiredEntries) {
      console.log('[ServiceWorker] Removing expired cache entry:', entry.request.url);
      await cache.delete(entry.request);
    }
    
    // Remove oldest entries if over limit
    const remainingEntries = entries.filter((entry) => {
      return now - entry.timestamp <= API_CACHE_MAX_AGE;
    });
    
    if (remainingEntries.length > API_CACHE_MAX_ENTRIES) {
      const entriesToRemove = remainingEntries.slice(0, remainingEntries.length - API_CACHE_MAX_ENTRIES);
      for (const entry of entriesToRemove) {
        console.log('[ServiceWorker] Removing old cache entry (over limit):', entry.request.url);
        await cache.delete(entry.request);
      }
    }
    
    console.log('[ServiceWorker] API cache cleanup complete');
  } catch (error) {
    console.error('[ServiceWorker] API cache cleanup failed:', error);
  }
}

/**
 * Message handler for cache management from the main app
 * Allows the app to control caching behavior
 */
self.addEventListener('message', (event) => {
  const { type, payload } = event.data || {};
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'CLEAR_CACHE':
      event.waitUntil(
        caches.keys().then((cacheNames) => {
          return Promise.all(
            cacheNames
              .filter((name) => name.startsWith('myvocab-'))
              .map((name) => caches.delete(name))
          );
        }).then(() => {
          event.ports[0]?.postMessage({ success: true });
        })
      );
      break;
      
    case 'CLEAR_API_CACHE':
      event.waitUntil(
        caches.delete(API_CACHE_NAME).then(() => {
          event.ports[0]?.postMessage({ success: true });
        })
      );
      break;
      
    case 'GET_CACHE_STATUS':
      event.waitUntil(
        Promise.all([
          caches.open(STATIC_CACHE_NAME).then((cache) => cache.keys()),
          caches.open(API_CACHE_NAME).then((cache) => cache.keys()),
        ]).then(([staticKeys, apiKeys]) => {
          event.ports[0]?.postMessage({
            version: CACHE_VERSION,
            staticEntries: staticKeys.length,
            apiEntries: apiKeys.length,
          });
        })
      );
      break;
      
    default:
      console.log('[ServiceWorker] Unknown message type:', type);
  }
});
