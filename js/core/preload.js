<script>
// ==================== preload.js ====================
// 預載入模組
// 依賴：api.js、state.js、time.js、core.js
// ==================================================

async function preloadTimeLimits() {
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
    }
  } catch (error) {
    console.warn('預載入時間限制失敗，使用預設值:', error);
  }
}

async function preloadTodayRestaurant() {
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
  } catch (error) {
    console.warn('預載入今日餐廳失敗:', error);
  }
}

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

async function runBasePreload() {
  console.log('🚀 開始基礎預載入...');

  await Promise.all([
    preloadTimeLimits(),
    preloadTodayRestaurant()
  ]);

  console.log('✅ 基礎預載入完成');
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

window.preloadTimeLimits = preloadTimeLimits;
window.preloadTodayRestaurant = preloadTodayRestaurant;
window.runBasePreload = runBasePreload;
window.runPagePreload = runPagePreload;
window.setupPageLoadedListener = setupPageLoadedListener;
window.waitForElement = waitForElement;

console.log('📦 預載入模組已載入');
</script>
