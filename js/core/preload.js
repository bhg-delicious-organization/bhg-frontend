// ==================== preload.js ====================
// 預載入模組
// 依賴：api.js、state.js、time.js
// ====================================================

/**
 * 預載入時間限制
 */
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
    }
  } catch (error) {
    console.warn('預載入時間限制失敗，使用預設值:', error);
  }
}

/**
 * 預載入今日餐廳
 */
async function preloadTodayRestaurant() {
  console.log('📡 預載入今日餐廳...');
  try {
    const result = await callApi('getTodayRestaurant', {});
    if (result && result.success) {
      AppState.setCurrentRestaurantName(result.restaurant);
      console.log('✅ 今日餐廳已快取:', result.restaurant);
    } else {
      console.log('ℹ️ 今日餐廳尚未設定');
    }
  } catch (error) {
    console.warn('預載入今日餐廳失敗:', error);
  }
}

/**
 * 等待元素出現
 */
function waitForElement(elementId, timeout = 3000) {
  return new Promise((resolve, reject) => {
    const el = document.getElementById(elementId);
    if (el) {
      resolve(el);
      return;
    }

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

/**
 * 自動預查詢
 */
async function autoQueryIfLoggedIn() {
  const studentId = AppState.currentStudentId();
  if (!studentId) return;

  console.log('🔍 自動預查詢學號:', studentId);

  // 填入輸入框
  const queryInput = document.getElementById('queryStudentId');
  const mealInput = document.getElementById('mealStudentId');
  if (queryInput) queryInput.value = studentId;
  if (mealInput) mealInput.value = studentId;

  // 執行查詢
  if (typeof queryUserInfo === 'function') {
    try {
      await queryUserInfo(true);
    } catch (error) {
      console.warn('自動預查詢失敗:', error);
    }
  }

  // 若在點餐時間，也載入訂飯頁
  if (isUserOrderTime() && typeof loadMealInfo === 'function') {
    waitForElement('mealStudentId', 3000).then(() => {
      const mealInput = document.getElementById('mealStudentId');
      if (mealInput && mealInput.value.trim()) {
        try {
          loadMealInfo();
        } catch (error) {
          console.warn('自動載入訂飯頁失敗:', error);
        }
      }
    }).catch(() => {
      console.log('ℹ️ 訂飯頁未在 3 秒內載入，跳過自動載入');
    });
  }
}

/**
 * 執行所有預載入（不含自動查詢）
 */
async function runPreload() {
  console.log('🚀 開始預載入...');

  await Promise.all([
    preloadTimeLimits(),
    preloadTodayRestaurant()
  ]);

  console.log('✅ 預載入完成');
  // ⚠️ 不在這裡呼叫 autoQueryIfLoggedIn
  // 由 initApp 在 navigateTo 之後呼叫
}

window.preloadTimeLimits = preloadTimeLimits;
window.preloadTodayRestaurant = preloadTodayRestaurant;
window.autoQueryIfLoggedIn = autoQueryIfLoggedIn;
window.runPreload = runPreload;

console.log('📦 預載入模組已載入');
