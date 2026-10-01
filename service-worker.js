// ==================== service-worker.js ====================
// PWA Service Worker
// 提供離線快取功能
// ==========================================================

const CACHE_NAME = 'bhg-cache-v1';

// 需要預快取的靜態資源
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
  './js/core/core.js'
];

// 安裝：預快取靜態資源
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

// 啟用：清除舊快取
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

// 攔截請求：快取優先，網路備援
self.addEventListener('fetch', function(event) {
  // 只處理 GET
  if (event.request.method !== 'GET') return;

  // GAS API 不快取
  if (event.request.url.includes('script.google.com')) {
    return;
  }

  // 圖片 CDN 不快取（讓瀏覽器處理）
  if (event.request.url.includes('i.ibb.co') ||
      event.request.url.includes('cdnjs.cloudflare.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(function(response) {
      if (response) {
        return response;
      }
      return fetch(event.request).then(function(networkResponse) {
        // 不快取非成功回應
        if (!networkResponse || networkResponse.status !== 200) {
          return networkResponse;
        }
        // 複製回應並加入快取
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      }).catch(function() {
        // 離線時，若是頁面導航請求，回傳首頁
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
