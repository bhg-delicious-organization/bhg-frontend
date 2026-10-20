// ==================== service-worker.js ====================
// PWA Service Worker
// ==========================================================

const VERSION = '3.7.8';  // ⚠️ 只改這行
const CACHE_NAME = 'bhg-cache-' + VERSION;

console.log(`📦 Service Worker 版本: ${VERSION}`);

const URLS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './styles.css',
  './assets/conan.png',
  './js/core/supabase.js',
  './js/core/state.js',
  './js/core/ui.js',
  './js/core/time.js',
  './js/core/common.js',
  './js/core/navigation.js',
  './js/core/preload.js',
  './js/core/core.js',
  './js/shared/notify.js',
  './js/shared/tutorial.js',
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
  './pages/user-system.html',
  './js/user/query.js',
  './js/user/register.js',
  './js/user/changepwd.js',
  './js/user/account.js',
  './js/user/meal.js',
  './js/user/meal-order.js',
  './js/admin/auth.js',
  './js/admin/restaurant.js',
  './js/admin/recharge.js',
  './js/admin/query.js',
  './js/admin/analytics.js',
  './js/admin/orders.js',
  './js/admin/users.js',
  './js/admin/deduct.js'
];

function isMajorUpdate(oldVersion, newVersion) {
  if (!oldVersion) return false;
  const oldParts = oldVersion.split('.').map(Number);
  const newParts = newVersion.split('.').map(Number);
  return oldParts[0] !== newParts[0];
}

self.addEventListener('install', function(event) {
  console.log(`📦 新版本 ${VERSION} 安裝中...`);
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(URLS_TO_CACHE).catch(function(err) {
        console.warn('⚠️ 部分資源快取失敗:', err);
      });
    })
  );
});

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

      return Promise.all(
        oldCacheNames.map(function(cacheName) {
          return caches.delete(cacheName);
        })
      ).then(function() {
        return { oldVersion, newVersion: VERSION, isMajorUpdate: isMajor };
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

self.addEventListener('fetch', function(event) {
  if (event.request.method !== 'GET') return;

  const url = event.request.url;

  if (!url.startsWith('http://') && !url.startsWith('https://')) return;

  if (url.includes('script.google.com')) return;
  if (url.includes('supabase.co')) return;
  if (url.includes('onesignal.com')) return;
  if (url.includes('OneSignalSDKWorker.js')) return;
  if (url.includes('OneSignalSDKUpdaterWorker.js')) return;
  if (url.includes('i.ibb.co') || url.includes('cdnjs.cloudflare.com')) return;
  if (url.includes('jsdelivr.net')) return;
  if (url.includes('/onesignal/')) return;

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

self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
