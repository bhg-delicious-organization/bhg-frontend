<script>
// ==================== time.js ====================
// 時間檢查模組
// 依賴：無
// ==================================================

/**
 * 時間常數（預設值，會被後端覆蓋）
 */
let TIME = {
  ORDER_START: 800,
  ORDER_END: 1000,
  ADMIN_START: 800,
  ADMIN_END: 1200,
  RATING_START: 1200,
  RATING_END: 1600
};

// ========== 獨立函數 ==========

/**
 * 獲取當前時間數字格式 (HHMM)
 * 例如：08:30 → 830
 */
function getCurrentTimeNumber() {
  const now = new Date();
  return now.getHours() * 100 + now.getMinutes();
}

/**
 * 檢查是否為使用者點餐時間
 */
function isUserOrderTime() {
  const current = getCurrentTimeNumber();
  return current >= TIME.ORDER_START && current < TIME.ORDER_END;
}

/**
 * 檢查點餐是否已截止
 */
function isOrderEnded() {
  return getCurrentTimeNumber() >= TIME.ORDER_END;
}

/**
 * 檢查是否為管理員設定餐廳時間
 */
function isAdminRestaurantTime() {
  const current = getCurrentTimeNumber();
  return current >= TIME.ADMIN_START && current < TIME.ADMIN_END;
}

/**
 * 檢查是否為評分時間
 */
function isRatingTime() {
  const current = getCurrentTimeNumber();
  return current >= TIME.RATING_START && current < TIME.RATING_END;
}

/**
 * 獲取點餐剩餘分鐘數
 */
function getOrderTimeRemaining() {
  const now = getCurrentTimeNumber();
  if (now >= TIME.ORDER_END) return 0;
  if (now < TIME.ORDER_START) return TIME.ORDER_START - now;
  return TIME.ORDER_END - now;
}

/**
 * 獲取評分剩餘分鐘數
 */
function getRatingTimeRemaining() {
  const now = getCurrentTimeNumber();
  if (now >= TIME.RATING_END) return 0;
  if (now < TIME.RATING_START) return TIME.RATING_START - now;
  return TIME.RATING_END - now;
}

/**
 * 格式化剩餘時間為易讀文字
 * @param {number} minutes - 剩餘分鐘數
 */
function formatTimeRemaining(minutes) {
  if (minutes <= 0) return '已截止';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) return `${hours}小時${mins}分鐘`;
  return `${mins}分鐘`;
}

/**
 * ✅ 新增：格式化時間 (HHMM → "HH:MM")
 * @param {number} time - 時間數字 (800 → "08:00", 2400 → "全天候")
 * @returns {string} 格式化字串
 */
function formatTimeHHMM(time) {
  if (Number(time) >= 2400) return '全天候';
  const hour = Math.floor(time / 100);
  const minute = time % 100;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/**
 * ✅ 新增：取得點餐時間範圍字串
 * @returns {string} 例如 "08:00 - 10:00" 或 "08:00 - 全天候"
 */
function getOrderTimeRange() {
  return `${formatTimeHHMM(TIME.ORDER_START)} - ${formatTimeHHMM(TIME.ORDER_END)}`;
}

// ========== 掛載到 window ==========
window.TIME = TIME;
window.getCurrentTimeNumber = getCurrentTimeNumber;
window.isUserOrderTime = isUserOrderTime;
window.isOrderEnded = isOrderEnded;
window.isAdminRestaurantTime = isAdminRestaurantTime;
window.isRatingTime = isRatingTime;
window.getOrderTimeRemaining = getOrderTimeRemaining;
window.getRatingTimeRemaining = getRatingTimeRemaining;
window.formatTimeRemaining = formatTimeRemaining;
window.formatTimeHHMM = formatTimeHHMM;
window.getOrderTimeRange = getOrderTimeRange;

// ========== TimeChecker 對象（向後兼容） ==========
window.TimeChecker = {
  getCurrentTimeNumber: getCurrentTimeNumber,
  isOrderTime: isUserOrderTime,
  isOrderEnded: isOrderEnded,
  isAdminRestaurantTime: isAdminRestaurantTime,
  isRatingTime: isRatingTime,
  getOrderTimeRemaining: getOrderTimeRemaining,
  getRatingTimeRemaining: getRatingTimeRemaining,
  formatTimeRemaining: formatTimeRemaining,
  formatTimeHHMM: formatTimeHHMM,
  getOrderTimeRange: getOrderTimeRange
};

console.log('⏰ 時間檢查模組已載入');
</script>
