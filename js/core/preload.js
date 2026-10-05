// ==================== preload.js ====================
// 預載入模組
// 依賴：api.js、state.js、time.js、core.js
// ==================================================

// ==================== 單例保護：時間限制 ====================

let _timeLimitsLoaded = false;
let _timeLimitsPromise = null;

async function preloadTimeLimits() {
  if (_timeLimitsLoaded) return;
  if (_timeLimitsPromise) return _timeLimitsPromise;

  _timeLimitsPromise = (async () => {
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
        console.log('✅ 時間限制已同步:', TIME);
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

// ==================== 單例保護：今日餐廳 ====================

let _todayRestaurantLoaded = false;
let _todayRestaurantPromise = null;

async function preloadTodayRestaurant() {
  if (_todayRestaurantLoaded) return;
  if (_todayRestaurantPromise) return _todayRestaurantPromise;

  _todayRestaurantPromise = (async () => {
    console.log('📡 預載入今日餐廳...');
    try {
      const result = await callApi('getTodayRestaurant', {});
      if (result && result.success) {
        AppState.setCurrentRestaurantName(result.restaurant);
        console.log('✅ 今日餐廳已快取:', result.restaurant);
      } else {
        console.log('ℹ️ 今日餐廳尚未設定');
        AppState.setCurrentRestaurantName('');
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

// ==================== 單例保護：餐廳菜單 ====================

let _menuCache = null;
let _menuCacheKey = null;
let _menuLoadingPromise = null;

/**
 * 載入餐廳菜單（含快取）
 * @param {string} restaurantName - 餐廳名稱
 * @returns {Promise<Object>} 菜單資料
 */
async function loadRestaurantMenu(restaurantName) {
  if (!restaurantName) {
    return { success: false, message: '缺少餐廳名稱' };
  }

  // 快取命中（同一個餐廳）
  if (_menuCache && _menuCacheKey === restaurantName) {
    console.log('📦 使用快取菜單:', restaurantName);
    return _menuCache;
  }

  // 正在載入中（同一個餐廳）
  if (_menuLoadingPromise && _menuCacheKey === restaurantName) {
    return _menuLoadingPromise;
  }

  // 開始載入
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

/**
 * 清除餐廳菜單快取（例如餐廳換了）
 */
function clearRestaurantMenuCache() {
  _menuCache = null;
  _menuCacheKey = null;
  _menuLoadingPromise = null;
  console.log('🗑️ 餐廳菜單快取已清除');
}

/**
 * 取得快取的菜單（同步）
 */
function getCachedRestaurantMenu() {
  return _menuCache;
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
window.runBasePreload = runBasePreload;
window.runFullPreload = runFullPreload;
window.runPagePreload = runPagePreload;
window.setupPageLoadedListener = setupPageLoadedListener;
window.waitForElement = waitForElement;
window.ensureTimeLimitsLoaded = ensureTimeLimitsLoaded;
window.ensureTodayRestaurantLoaded = ensureTodayRestaurantLoaded;

console.log('📦 預載入模組已載入');
