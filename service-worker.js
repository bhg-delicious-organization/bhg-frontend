// ==================== service-worker.js ==================== //
// PWA Service Worker（全自動更新 + 離線備用頁面版）
// ========================================================== //

// 引入 Workbox SW
importScripts('https://storage.googleapis.com/workbox-cdn/releases/5.1.2/workbox-sw.js');

const CACHE_NAME = 'bhg-cache-v4.0.1';
const CACHE_OFFLINE = 'offline-page-v1';
const OFFLINE_FALLBACK_PAGE = 'offline.html';

console.log(`📦 Service Worker 啟動`);

// 啟用 Navigation Preload（如果瀏覽器支援）
if (workbox && workbox.navigationPreload && workbox.navigationPreload.isSupported()) {
  workbox.navigationPreload.enable();
}

// 1. 安裝時：預先將 offline.html 寫入離線快取，並跳過等待
self.addEventListener('install', function (event) {
  console.log('📦 Service Worker 安裝中...');
  event.waitUntil(
    caches.open(CACHE_OFFLINE).then(function (cache) {
      console.log('📄 預先載入離線備用頁面:', OFFLINE_FALLBACK_PAGE);
      return cache.add(OFFLINE_FALLBACK_PAGE);
    }).then(() => self.skipWaiting())
  );
});

// 2. 啟用時：清除所有舊版快取（保留離線頁面快取）
self.addEventListener('activate', function (event) {
  console.log('✅ Service Worker 已啟用，清理舊快取...');
  event.waitUntil(
    caches.keys().then(function (cacheNames) {
      return Promise.all(
        cacheNames.map(function (cacheName) {
          if (cacheName !== CACHE_NAME && cacheName !== CACHE_OFFLINE) {
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

// 4. 攔截請求：網路優先 (Network-First) + HTML 離線退回機制
self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;

  const url = event.request.url;

  // 跳過外部 API、CDN 和 OneSignal
  if (
    url.includes('script.google.com') ||
    url.includes('supabase.co') ||
    url.includes('onesignal.com') ||
    url.includes('cdnjs.cloudflare.com') ||
    url.includes('jsdelivr.net')
  ) {
    return;
  }

  // A. 頁面導航請求 (HTML 瀏覽請求)：結合 Navigation Preload 與 Offline Fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          // 優先讀取預載入的回應
          const preloadResp = await event.preloadResponse;
          if (preloadResp) {
            return preloadResp;
          }

          // 透過網路取得最新頁面，並同步更新到快取
          const networkResponse = await fetch(event.request);
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            const cache = await caches.open(CACHE_NAME);
            await cache.put(event.request, responseToCache);
          }
          return networkResponse;
        } catch (error) {
          console.warn('⚠️ 網路斷開，嘗試提供快取頁面或離線備用頁');
          
          // 斷網時：先嘗試讀取該頁面過去的快取
          /*const cache = await caches.open(CACHE_NAME);
          const cachedResp = await cache.match(event.request);
          if (cachedResp) {
            return cachedResp;
          }*/

          // 若過去未快取該頁面，則提供離線備用頁 offline.html
          const offlineCache = await caches.open(CACHE_OFFLINE);
          return await offlineCache.match(OFFLINE_FALLBACK_PAGE);
        }
      })()
    );
    return;
  }

  // B. 靜態資源請求 (CSS, JS, 圖片等)：維持原有的 Network-First 邏輯
  event.respondWith(
    fetch(event.request)
      .then(function (networkResponse) {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(function () {
        // 斷網時，嘗試從快取拿資料
        return caches.match(event.request);
      })
  );
});

/*

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

*/
