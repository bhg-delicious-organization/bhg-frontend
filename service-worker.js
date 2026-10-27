// ==================== service-worker.js ====================
// PWA Service Worker（全自動更新版）
// ==========================================================

const CACHE_NAME = 'bhg-cache-v4.0.0';

console.log(`📦 Service Worker 啟動`);

// 1. 安裝時：不預先快取，直接跳過等待
self.addEventListener('install', function (event) {
  console.log('📦 Service Worker 安裝中...');
  self.skipWaiting(); 
});

// 2. 啟用時：清除所有舊版快取
self.addEventListener('activate', function (event) {
  console.log('✅ Service Worker 已啟用，清理舊快取...');
  event.waitUntil(
    caches.keys().then(function (cacheNames) {
      return Promise.all(
        cacheNames.map(function (cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ 清除舊快取:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // 立刻接管現有頁面
  );
});

// 3. 接收主執行緒的指令（自動更新用）
self.addEventListener('message', function (event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('⚡ 收到 SKIP_WAITING 指令，立刻接管頁面！');
    self.skipWaiting();
  }
});

// 4. 攔截請求：網路優先 (Network-First)
self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;

  const url = event.request.url;

  // 跳過外部 API、CDN 和 OneSignal
  if (url.includes('script.google.com') || 
      url.includes('supabase.co') || 
      url.includes('onesignal.com') || 
      url.includes('cdnjs.cloudflare.com') || 
      url.includes('jsdelivr.net')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(function (networkResponse) {
        // 拿到最新資料後，順便更新快取（供離線時使用）
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(function () {
        // 斷網時，才從快取拿資料
        return caches.match(event.request);
      })
  );
});
