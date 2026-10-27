// ==================== service-worker.js ====================
// PWA Service Worker（開發階段：網路優先策略）
// ==========================================================

const SUPABASE_URL = 'https://wvvmnombzkkrtxxxucqe.supabase.co';
const SUPABASE_KEY = 'sb_publishable_oK9kGQMbcBdGyoerrrfDzQ_yWyRZcQf';

// 預設版本
let VERSION = '4.0.3'; 
let CACHE_NAME = 'bhg-cache-v4.0.3';

console.log(`📦 Service Worker 啟動（版本: ${VERSION}）`);

// ═══════════════════════════════════════════════════════════════
// install 事件：強制跳過等待，立即啟用
// ═══════════════════════════════════════════════════════════════
self.addEventListener('install', function (event) {
  console.log('📦 Service Worker 安裝中...');
  self.skipWaiting(); // 強制立刻接管
});

// ═══════════════════════════════════════════════════════════════
// activate 事件：清除所有舊快取
// ═══════════════════════════════════════════════════════════════
self.addEventListener('activate', function (event) {
  console.log('✅ Service Worker 已啟用，正在清除舊快取...');
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
    }).then(() => self.clients.claim())
  );
});

// ═══════════════════════════════════════════════════════════════
// fetch 事件：網路優先 (Network-First)
// ═══════════════════════════════════════════════════════════════
self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;

  const url = event.request.url;

  // 跳過外部 API 和 CDN
  if (url.includes('script.google.com') || 
      url.includes('supabase.co') || 
      url.includes('onesignal.com') || 
      url.includes('cdnjs.cloudflare.com') || 
      url.includes('jsdelivr.net')) {
    return;
  }

  // 針對 HTML, JS, CSS 採用「網路優先」
  // 每次都先跟伺服器要最新的，拿到後更新快取；斷網時才用快取
  event.respondWith(
    fetch(event.request)
      .then(function (networkResponse) {
        if (!networkResponse || networkResponse.status !== 200) {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then(function (cache) {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      })
      .catch(function () {
        // 網路失敗時，回退到快取
        return caches.match(event.request);
      })
  );
});
