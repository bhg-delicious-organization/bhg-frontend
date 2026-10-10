// ==================== service-worker.js ====================
// PWA Service Worker（自動判斷大改/小改）
// ==========================================================

const VERSION = '3.2.1';  // ⚠️ 只改這行
const CACHE_NAME = 'bhg-cache-' + VERSION;

console.log(`📦 Service Worker 版本: ${VERSION}`);

const URLS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './api.js',
  './styles.css',
  './assets/conan.png',
  './js/core/supabase.js',
  './js/core/state.js',
  './js/core/ui.js',
  './js/core/time.js',
  './js/core/common.js',
  './js/core/navigation.js',
  './js/core/preload.js',
  './js/core/quick-id.js',
  './js/core/core.js',
  './js/shared/notify.js',
  './js/shared/tutorial.js',
  // 頁面片段
  './pages/admin-account.html',
  './pages/admin-analytics.html',
  './pages/admin-batch-deduct.html',
  './pages/admin-giftcode.html',
  './pages/admin-orders.html',
  './pages/admin-query.html',
  './pages/admin-restaurant.html',
  './pages/admin-users.html',
  './pages/user-account.html',
  './pages/user-changepwd.html',
  './pages/user-meal-order.html',
  './pages/user-meal.html',
  './pages/user-query.html',
  './pages/user-recharge.html',
  './pages/user-register.html',
  './pages/user-system.html',
  // 使用者模組
  './js/user/query.js',
  './js/user/register.js',
  './js/user/gift.js',
  './js/user/changepwd.js',
  './js/user/account.js',
  './js/user/meal.js',
  './js/user/meal-order.js',
  // 管理員模組
  './js/admin/auth.js',
  './js/admin/restaurant.js',
  './js/admin/gift.js',
  './js/admin/recharge.js',
  './js/admin/query.js',
  './js/admin/analytics.js',
  './js/admin/orders.js',
  './js/admin/users.js',
  './js/admin/deduct.js'
];

// ==================== 判斷是否為大改 ====================
function isMajorUpdate(oldVersion, newVersion) {
  if (!oldVersion) return false;
  const oldParts = oldVersion.split('.').map(Number);
  const newParts = newVersion.split('.').map(Number);
  return oldParts[0] !== newParts[0];
}

// ==================== 安裝 ====================
self.addEventListener('install', function(event) {
  console.log(`📦 新版本 ${VERSION} 安裝中...`);
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(URLS_TO_CACHE).catch(function(err) {
        console.warn('⚠️ 部分資源快取失敗:', err);
      });
    })
    // ✅ 不呼叫 skipWaiting()，等前端確認
  );
});

// ==================== 啟用 ====================
self.addEventListener('activate', function(event) {
  console.log(`✅ 新版本 ${VERSION} 已啟用`);

  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      const oldCacheNames = cacheNames.filter(function(name) {
        return name.startsWith('bhg-cache-') && name !== CACHE_NAME;
      });

      let oldVersion = null;
      if (oldCacheNames.length > 0) {
        oldVersion = oldCacheNames[0].replace('bhg-cache-', '');
      }

      const isMajor = isMajorUpdate(oldVersion, VERSION);
      console.log(`🔍 舊版本: ${oldVersion || '無'} | 新版本: ${VERSION} | 大改: ${isMajor}`);

      return Promise.all(
        oldCacheNames.map(function(cacheName) {
          console.log('🗑️ 清除舊快取:', cacheName);
          return caches.delete(cacheName);
        })
      ).then(function() {
        return {
          oldVersion: oldVersion,
          newVersion: VERSION,
          isMajorUpdate: isMajor
        };
      });
    }).then(function(updateInfo) {
      return self.clients.claim().then(function() {
        return updateInfo;
      });
    }).then(function(updateInfo) {
      return self.clients.matchAll({ type: 'window' }).then(function(clients) {
        clients.forEach(function(client) {
          client.postMessage({
            type: 'SW_UPDATED',
            oldVersion: updateInfo.oldVersion,
            newVersion: updateInfo.newVersion,
            isMajorUpdate: updateInfo.isMajorUpdate
          });
        });
      });
    })
  );
});

// ==================== 攔截請求 ====================
self.addEventListener('fetch', function(event) {
  if (event.request.method !== 'GET') return;

  const url = event.request.url;

  // ✅ 只處理 http/https
  if (!url.startsWith('http://') && !url.startsWith('https://')) return;

  // ✅ 排除特定來源
  if (url.includes('script.google.com')) return;
  if (url.includes('onesignal.com')) return;
  if (url.includes('OneSignalSDKWorker.js')) return;
  if (url.includes('OneSignalSDKUpdaterWorker.js')) return;
  if (url.includes('i.ibb.co') || url.includes('cdnjs.cloudflare.com')) return;
  if (url.includes('/onesignal/')) return;

  // ✅ index.html 走 Network First（永遠拿最新）
  if (url.endsWith('/') || url.endsWith('/index.html') || url.includes('/index.html?')) {
    event.respondWith(
      fetch(event.request).then(function(response) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, clone);
        }).catch(function() {});
        return response;
      }).catch(function() {
        return caches.match(event.request);
      })
    );
    return;
  }

  // ✅ 其他資源走 Cache First
  event.respondWith(
    caches.match(event.request).then(function(response) {
      if (response) return response;

      return fetch(event.request).then(function(networkResponse) {
        if (!networkResponse || networkResponse.status !== 200) {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        const requestToCache = event.request.clone();

        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(requestToCache, responseToCache).catch(function() {});
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

// ==================== 接收訊息 ====================
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
