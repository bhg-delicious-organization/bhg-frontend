// ==================== service-worker.js ====================
// PWA Service Worker（只管快取）
// 路徑：/bhg-frontend/service-worker.js
// ==========================================================

const CACHE_NAME = 'bhg-cache-v3';  // 版本號更新

const URLS_TO_CACHE = [
  './',
  './index.html',
  './api.js',
  './styles.css',
  './assets/conan.png',
  './js/core/state.js',
  './js/core/ui.js',
  './js/core/time.js',
  './js/core/common.js',
  './js/core/navigation.js',
  './js/core/preload.js',
  './js/core/quick-id.js',
  './js/core/core.js',
  './js/shared/notify.js',
  './js/shared/tutorial.js'
];

// ==================== 安裝 ====================
self.addEventListener('install', function(event) {
  console.log('📦 Service Worker 安裝中...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      console.log('📦 預快取靜態資源');
      return cache.addAll(URLS_TO_CACHE).catch(function(err) {
        console.warn('⚠️ 部分資源快取失敗:', err);
      });
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

// ==================== 啟用 ====================
self.addEventListener('activate', function(event) {
  console.log('✅ Service Worker 已啟用');
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ 清除舊快取:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// ==================== 攔截請求 ====================
self.addEventListener('fetch', function(event) {
  if (event.request.method !== 'GET') return;

  const url = event.request.url;

  if (url.includes('script.google.com')) return;
  if (url.includes('onesignal.com')) return;
  if (url.includes('i.ibb.co') || url.includes('cdnjs.cloudflare.com')) return;

  event.respondWith(
    caches.match(event.request).then(function(response) {
      if (response) return response;

      return fetch(event.request).then(function(networkResponse) {
        if (!networkResponse || networkResponse.status !== 200) {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      }).catch(function() {
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
