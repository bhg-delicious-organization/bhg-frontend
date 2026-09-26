// ==================== preload.js ====================
// 預載入模組
// 目的：一進頁面就先載入常用資料，減少等待
// 依賴：api.js、state.js、time.js
// ====================================================

/**
 * 預載入時間限制（從後端取得，取代前端硬編碼）
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
 * 自動預查詢（若已登入學號，自動查詢餘額）
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

  // 執行查詢（若查詢函數存在）
  if (typeof queryUserInfo === 'function') {
    try {
      await queryUserInfo(true);
    } catch (error) {
      console.warn('自動預查詢失敗:', error);
    }
  }

  // 若在點餐時間，也載入訂飯頁
  if (isUserOrderTime() && typeof loadMealInfo === 'function') {
    setTimeout(() => {
      try {
        loadMealInfo();
      } catch (error) {
        console.warn('自動載入訂飯頁失敗:', error);
      }
    }, 300);
  }
}

/**
 * 執行所有預載入
 */
async function runPreload() {
  console.log('🚀 開始預載入...');

  // 平行執行所有預載入
  await Promise.all([
    preloadTimeLimits(),
    preloadTodayRestaurant()
  ]);

  console.log('✅ 預載入完成');

  // 等時間限制載入後，才做自動查詢（因為需要判斷點餐時間）
  setTimeout(autoQueryIfLoggedIn, 500);
}

// 掛載到 window
window.preloadTimeLimits = preloadTimeLimits;
window.preloadTodayRestaurant = preloadTodayRestaurant;
window.autoQueryIfLoggedIn = autoQueryIfLoggedIn;
window.runPreload = runPreload;

console.log('📦 預載入模組已載入');
