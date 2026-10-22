// ==================== service-worker.js ====================
// PWA Service Worker（Sprint 3.3：版本從 Supabase 讀取）
// ==========================================================

// ═══════════════════════════════════════════════════════════════
// Supabase 設定（與 supabase.js 一致）
// ═══════════════════════════════════════════════════════════════

const SUPABASE_URL = 'https://wvvmnombzkkrtxxxucqe.supabase.co';
const SUPABASE_KEY = 'sb_publishable_oK9kGQMbcBdGyoerrrfDzQ_yWyRZcQf';

// 預設版本（如果 Supabase 讀取失敗時使用）
const FALLBACK_VERSION = '3.7.0';

let VERSION = FALLBACK_VERSION;
let CACHE_NAME = 'bhg-cache-' + FALLBACK_VERSION;

console.log(`📦 Service Worker 啟動（預設版本: ${FALLBACK_VERSION}）`);

// ═══════════════════════════════════════════════════════════════
// 從 Supabase 讀取版本號
// ═══════════════════════════════════════════════════════════════

async function fetchVersionFromSupabase() {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/system_settings?key=eq.version&select=value`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
        },
      }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data && data[0] && data[0].value) {
      return data[0].value;
    }
    return FALLBACK_VERSION;
  } catch (e) {
    console.warn('⚠️ 無法從 Supabase 讀取版本，使用預設值:', e.message);
    return FALLBACK_VERSION;
  }
}

// ═══════════════════════════════════════════════════════════════
// 快取清單
// ═══════════════════════════════════════════════════════════════

const URLS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
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
  './js/admin/deduct.js',
];

// ═══════════════════════════════════════════════════════════════
// install 事件：讀版本 + 快取資源
// ═══════════════════════════════════════════════════════════════

self.addEventListener('install', function (event) {
  event.waitUntil(
    (async () => {
      // 1. 從 Supabase 讀取版本
      VERSION = await fetchVersionFromSupabase();
      CACHE_NAME = 'bhg-cache-' + VERSION;
      console.log(`📦 新版本 ${VERSION} 安裝中...`);

      self.skipWaiting();

      // 2. 快取資源（逐一快取，單一失敗不影響全部）
      const cache = await caches.open(CACHE_NAME);
      const results = await Promise.allSettled(
        URLS_TO_CACHE.map((url) =>
          fetch(url, { cache: 'no-cache' }).then((res) => {
            if (!res.ok) throw new Error(`${url} → ${res.status}`);
            return cache.put(url, res);
          })
        )
      );

      const failed = results.filter((r) => r.status === 'rejected');
      if (failed.length > 0) {
        console.warn('⚠️ 部分資源快取失敗:');
        failed.forEach((f) => console.warn('  -', f.reason?.message || f.reason));
      } else {
        console.log('✅ 所有資源已快取');
      }
    })()
  );
});

// ═══════════════════════════════════════════════════════════════
// activate 事件：清除舊快取 + 通知客戶端
// ═══════════════════════════════════════════════════════════════

self.addEventListener('activate', function (event) {
  event.waitUntil(
    (async () => {
      // 確保版本已讀取
      if (!VERSION || VERSION === FALLBACK_VERSION) {
        VERSION = await fetchVersionFromSupabase();
        CACHE_NAME = 'bhg-cache-' + VERSION;
      }
      console.log(`✅ 新版本 ${VERSION} 已啟用`);

      // 清除舊快取
      const cacheNames = await caches.keys();
      const oldCacheNames = cacheNames.filter(
        (name) => name.startsWith('bhg-cache-') && name !== CACHE_NAME
      );

      let oldVersion = null;
      if (oldCacheNames.length > 0) {
        oldVersion = oldCacheNames[0].replace('bhg-cache-', '');
      }

      await Promise.all(oldCacheNames.map((name) => caches.delete(name)));

      // 接管所有頁面 + 通知更新
      await self.clients.claim();
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach((client) => {
        client.postMessage({
          type: 'SW_UPDATED',
          oldVersion,
          newVersion: VERSION,
        });
      });
    })()
  );
});

// ═══════════════════════════════════════════════════════════════
// fetch 事件：快取優先，網路備援
// ═══════════════════════════════════════════════════════════════

self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;

  const url = event.request.url;

  // 只處理 http/https
  if (!url.startsWith('http://') && !url.startsWith('https://')) return;

  // 跳過外部 API 和 CDN
  if (url.includes('script.google.com')) return;
  if (url.includes('supabase.co')) return;
  if (url.includes('onesignal.com')) return;
  if (url.includes('OneSignalSDKWorker.js')) return;
  if (url.includes('OneSignalSDKUpdaterWorker.js')) return;
  if (url.includes('cdnjs.cloudflare.com')) return;
  if (url.includes('jsdelivr.net')) return;
  if (url.includes('/onesignal/')) return;

  // 導航請求：網路優先，離線時用快取
  if (
    url.endsWith('/') ||
    url.endsWith('/index.html') ||
    url.includes('/index.html?')
  ) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches
            .open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, clone);
            })
            .catch(() => {});
          return response;
        })
        .catch(async () => {
          const tries = [
            event.request,
            '/bhg-frontend/index.html',
            '/bhg-frontend/',
            'index.html',
            './',
          ];
          for (const t of tries) {
            const hit = await caches.match(t, { ignoreSearch: true });
            if (hit) return hit;
          }
          return new Response(
            '<h1>離線中</h1><p>請檢查網路連線後重試</p>',
            { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
        })
    );
    return;
  }

  // 其他資源：快取優先
  event.respondWith(
    caches.match(event.request).then(function (response) {
      if (response) return response;

      return fetch(event.request)
        .then(function (networkResponse) {
          if (!networkResponse || networkResponse.status !== 200) {
            return networkResponse;
          }

          const responseToCache = networkResponse.clone();
          const requestToCache = event.request.clone();

          caches
            .open(CACHE_NAME)
            .then(function (cache) {
              cache.put(requestToCache, responseToCache).catch(function () {});
            });

          return networkResponse;
        })
        .catch(function () {
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
    })
  );
});

// ═══════════════════════════════════════════════════════════════
// message 事件：手動觸發 skipWaiting
// ═══════════════════════════════════════════════════════════════

self.addEventListener('message', function (event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
