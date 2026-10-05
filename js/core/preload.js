// ==================== preload.js ====================
// 預載入模組
// 依賴：api.js、state.js、time.js、core.js
// ==================================================

// ==================== 單例保護：時間限制（含 localStorage 快取） ====================

const TIME_LIMITS_CACHE_KEY = 'bhg_timeLimits';
const TIME_LIMITS_CACHE_TIME_KEY = 'bhg_timeLimitsTime';
const TIME_LIMITS_CACHE_TTL = 60 * 60 * 1000; // 1 小時

let _timeLimitsLoaded = false;
let _timeLimitsPromise = null;

async function preloadTimeLimits() {
  if (_timeLimitsLoaded) return;
  if (_timeLimitsPromise) return _timeLimitsPromise;

  _timeLimitsPromise = (async () => {
    const cached = localStorage.getItem(TIME_LIMITS_CACHE_KEY);
    const cachedTime = localStorage.getItem(TIME_LIMITS_CACHE_TIME_KEY);
    const now = Date.now();

    if (cached && cachedTime && (now - parseInt(cachedTime)) < TIME_LIMITS_CACHE_TTL) {
      try {
        const parsed = JSON.parse(cached);
        TIME.ORDER_START = parsed.ORDER_START;
        TIME.ORDER_END = parsed.ORDER_END;
        TIME.ADMIN_START = parsed.ADMIN_START;
        TIME.ADMIN_END = parsed.ADMIN_END;
        TIME.RATING_START = parsed.RATING_START;
        TIME.RATING_END = parsed.RATING_END;
        console.log('📦 使用快取時間限制:', TIME);
        _timeLimitsLoaded = true;

        callApi('getTimeLimits', {}).then(result => {
          if (result && result.success && result.limits) {
            const newLimits = {
              ORDER_START: result.limits.ORDER_START,
              ORDER_END: result.limits.ORDER_END,
              ADMIN_START: result.limits.ADMIN_RESTAURANT_START,
              ADMIN_END: result.limits.ADMIN_RESTAURANT_END,
              RATING_START: result.limits.RATING_START,
              RATING_END: result.limits.RATING_END
            };

            const hasChanged = JSON.stringify(newLimits) !== JSON.stringify(parsed);
            if (hasChanged) {
              localStorage.setItem(TIME_LIMITS_CACHE_KEY, JSON.stringify(newLimits));
              localStorage.setItem(TIME_LIMITS_CACHE_TIME_KEY, String(Date.now()));
              console.log('🔄 背景更新時間限制（有變）:', newLimits);
            } else {
              localStorage.setItem(TIME_LIMITS_CACHE_TIME_KEY, String(Date.now()));
              console.log('✅ 背景確認時間限制無變');
            }
          }
        });

        return;
      } catch (e) {
        console.warn('快取解析失敗，重新載入:', e);
      }
    }

    console.log('⏰ 預載入時間限制...');
    try {
      const result = await callApi('getTimeLimits', {});
      if (result && result.success && result.limits) {
        TIME.ORDER_START = result.limits.ORDER_START;
        TIME.ORDER_END = result.limits.ORDER_END;
        TIME.ADMIN_START = result.limits.ADMIN_RESTAURANT_START;
        TIME.ADMIN_END = result.limits.ADMIN_RESTAURANT_END;
        TIME.RATING_START = result.limits.RATING_START;
        TIME.RATING_END = result.limits.RATING_END;

        const limitsToCache = {
          ORDER_START: result.limits.ORDER_START,
          ORDER_END: result.limits.ORDER_END,
          ADMIN_START: result.limits.ADMIN_RESTAURANT_START,
          ADMIN_END: result.limits.ADMIN_RESTAURANT_END,
          RATING_START: result.limits.RATING_START,
          RATING_END: result.limits.RATING_END
        };
        localStorage.setItem(TIME_LIMITS_CACHE_KEY, JSON.stringify(limitsToCache));
        localStorage.setItem(TIME_LIMITS_CACHE_TIME_KEY, String(Date.now()));

        console.log('✅ 時間限制已同步並快取:', TIME);
        console.log('   點餐時間範圍:', getOrderTimeRange());
        _timeLimitsLoaded = true;
      }
    } catch (error) {
      console.warn('預載入時間限制失敗，使用預設值:', error);
    } finally {
      _timeLimitsPromise = null;
    }
  })();

  return _timeLimitsPromise;
}

// ==================== 單例保護：今日餐廳（含日期快取） ====================

let _todayRestaurantLoaded = false;
let _todayRestaurantPromise = null;

function getTodayDateKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function preloadTodayRestaurant() {
  if (_todayRestaurantLoaded) return;
  if (_todayRestaurantPromise) return _todayRestaurantPromise;

  _todayRestaurantPromise = (async () => {
    const today = getTodayDateKey();
    const cacheKey = `bhg_todayRestaurant_${today}`;
    const cached = localStorage.getItem(cacheKey);

    if (cached !== null) {
      console.log('📦 使用今日餐廳快取:', cached || '（未設定）');
      AppState.setCurrentRestaurantName(cached || '');
      _todayRestaurantLoaded = true;

      callApi('getTodayRestaurant', {}).then(result => {
        if (result && result.success) {
          const newRestaurant = result.restaurant || '';
          if (newRestaurant !== cached) {
            AppState.setCurrentRestaurantName(newRestaurant);
            localStorage.setItem(cacheKey, newRestaurant);
            console.log('🔄 背景更新今日餐廳:', newRestaurant || '（未設定）');

            if (AppState.currentPage() === 'user-meal') {
              if (typeof loadMealInfo === 'function') {
                loadMealInfo();
              }
            }
          } else {
            console.log('✅ 背景確認今日餐廳無變');
          }
        }
      });

      return;
    }

    console.log('📡 預載入今日餐廳...');
    try {
      const result = await callApi('getTodayRestaurant', {});
      if (result && result.success) {
        const restaurant = result.restaurant || '';
        AppState.setCurrentRestaurantName(restaurant);
        localStorage.setItem(cacheKey, restaurant);
        console.log('✅ 今日餐廳已快取:', restaurant || '（未設定）');
      } else {
        console.log('ℹ️ 今日餐廳尚未設定');
        AppState.setCurrentRestaurantName('');
        localStorage.setItem(cacheKey, '');
      }
      _todayRestaurantLoaded = true;
    } catch (error) {
      console.warn('預載入今日餐廳失敗:', error);
    } finally {
      _todayRestaurantPromise = null;
    }
  })();

  return _todayRestaurantPromise;
}

function clearTodayRestaurantCache() {
  const today = getTodayDateKey();
  const cacheKey = `bhg_todayRestaurant_${today}`;
  localStorage.removeItem(cacheKey);
  _todayRestaurantLoaded = false;
  _todayRestaurantPromise = null;
  console.log('🗑️ 今日餐廳快取已清除');
}

function cleanupOldRestaurantCache() {
  const today = getTodayDateKey();
  const keys = Object.keys(localStorage);

  keys.forEach(key => {
    if (key.startsWith('bhg_todayRestaurant_') && !key.endsWith(today)) {
      localStorage.removeItem(key);
      console.log('🗑️ 清除舊的今日餐廳快取:', key);
    }
  });
}

// ==================== 單例保護：餐廳菜單 ====================

let _menuCache = null;
let _menuCacheKey = null;
let _menuLoadingPromise = null;

async function loadRestaurantMenu(restaurantName) {
  if (!restaurantName) {
    return { success: false, message: '缺少餐廳名稱' };
  }

  if (_menuCache && _menuCacheKey === restaurantName) {
    console.log('📦 使用快取菜單:', restaurantName);
    return _menuCache;
  }

  if (_menuLoadingPromise && _menuCacheKey === restaurantName) {
    return _menuLoadingPromise;
  }

  _menuCacheKey = restaurantName;
  _menuLoadingPromise = (async () => {
    console.log('📥 載入餐廳菜單:', restaurantName);
    try {
      const result = await callApi('getRestaurantMenu', {
        restaurantName: restaurantName
      });

      if (result && result.success) {
        _menuCache = result;
        console.log('✅ 餐廳菜單已快取:', restaurantName, `(${result.categories.length} 個分類)`);
      } else {
        console.warn('⚠️ 載入菜單失敗:', result?.message);
      }

      return result;
    } catch (error) {
      console.warn('載入菜單失敗:', error);
      return { success: false, message: '載入失敗' };
    } finally {
      _menuLoadingPromise = null;
    }
  })();

  return _menuLoadingPromise;
}

function clearRestaurantMenuCache() {
  _menuCache = null;
  _menuCacheKey = null;
  _menuLoadingPromise = null;
  console.log('🗑️ 餐廳菜單快取已清除');
}

function getCachedRestaurantMenu() {
  return _menuCache;
}

// ==================== 預載入所有頁面 ====================

async function preloadAllPages() {
  const pages = [
    'user-query', 'user-recharge', 'user-meal', 'user-register',
    'user-account', 'user-system', 'user-changepwd', 'user-meal-order',
    'admin-restaurant', 'admin-batch-deduct', 'admin-giftcode',
    'admin-query', 'admin-account', 'admin-analytics',
    'admin-orders', 'admin-users'
  ];

  const pageContent = document.getElementById('pageContent');
  if (!pageContent) return;

  console.log('📚 開始預載入所有頁面...');

  const results = await Promise.allSettled(
    pages.map(name =>
      fetch(`pages/${name}.html`)
        .then(r => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.text();
        })
        .then(html => ({ name, html }))
    )
  );

  let successCount = 0;
  results.forEach(result => {
    if (result.status === 'fulfilled') {
      const { name, html } = result.value;
      if (!document.getElementById('page-' + name)) {
        pageContent.insertAdjacentHTML('beforeend', html);
        successCount++;
      }
    } else {
      console.warn('⚠️ 頁面預載入失敗:', result.reason);
    }
  });

  console.log(`✅ 頁面預載入完成：${successCount}/${pages.length}`);
}

// ==================== 其他工具 ====================

function waitForElement(elementId, timeout = 3000) {
  return new Promise((resolve, reject) => {
    const el = document.getElementById(elementId);
    if (el) { resolve(el); return; }

    const startTime = Date.now();
    const interval = setInterval(() => {
      const el = document.getElementById(elementId);
      if (el) {
        clearInterval(interval);
        resolve(el);
        return;
      }
      if (Date.now() - startTime > timeout) {
        clearInterval(interval);
        reject(new Error(`等待元素 ${elementId} 超時`));
      }
    }, 100);
  });
}

// ==================== 預載入流程 ====================

async function runBasePreload() {
  console.log('🚀 開始基礎預載入...');
  await preloadTodayRestaurant();
  preloadTimeLimits();
  console.log('✅ 基礎預載入完成');
}

async function runFullPreload() {
  console.log('🚀 開始完整預載入...');
  await Promise.all([
    preloadTimeLimits(),
    preloadTodayRestaurant()
  ]);
  console.log('✅ 完整預載入完成');
}

async function runPagePreload(pageName) {
  const studentId = AppState.currentStudentId();
  if (!studentId) {
    console.log(`ℹ️ 未登入學號，跳過頁面預載入 [${pageName}]`);
    return;
  }

  console.log(`🎯 執行頁面預載入 [${pageName}]，學號: ${studentId}`);

  switch (pageName) {
    case 'user-query':
      if (typeof queryUserInfo === 'function') {
        const queryInput = document.getElementById('queryStudentId');
        if (queryInput) {
          queryInput.value = studentId;
          try { await queryUserInfo(true); } catch (e) { console.warn(e); }
        }
      }
      break;

    case 'user-meal':
      if (typeof loadMealInfo === 'function') {
        const mealInput = document.getElementById('mealStudentId');
        if (mealInput) {
          mealInput.value = studentId;
          try { await loadMealInfo(); } catch (e) { console.warn(e); }
        }
      }
      break;

    case 'user-account':
      break;

    default:
      console.log(`ℹ️ 頁面 ${pageName} 無需預載入`);
      break;
  }
}

function setupPageLoadedListener() {
  window.addEventListener('pageLoaded', function(event) {
    const pageName = event.detail.pageName;
    console.log('📥 收到 pageLoaded 事件:', pageName);
    runPagePreload(pageName);
  });
  console.log('✅ 已監聽 pageLoaded 事件');
}

// ==================== 對外接口 ====================

async function ensureTimeLimitsLoaded() {
  await preloadTimeLimits();
}

async function ensureTodayRestaurantLoaded() {
  await preloadTodayRestaurant();
}

window.preloadTimeLimits = preloadTimeLimits;
window.preloadTodayRestaurant = preloadTodayRestaurant;
window.loadRestaurantMenu = loadRestaurantMenu;
window.clearRestaurantMenuCache = clearRestaurantMenuCache;
window.getCachedRestaurantMenu = getCachedRestaurantMenu;
window.clearTodayRestaurantCache = clearTodayRestaurantCache;
window.cleanupOldRestaurantCache = cleanupOldRestaurantCache;
window.getTodayDateKey = getTodayDateKey;
window.preloadAllPages = preloadAllPages;
window.runBasePreload = runBasePreload;
window.runFullPreload = runFullPreload;
window.runPagePreload = runPagePreload;
window.setupPageLoadedListener = setupPageLoadedListener;
window.waitForElement = waitForElement;
window.ensureTimeLimitsLoaded = ensureTimeLimitsLoaded;
window.ensureTodayRestaurantLoaded = ensureTodayRestaurantLoaded;

console.log('📦 預載入模組已載入');
