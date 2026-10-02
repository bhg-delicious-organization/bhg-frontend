// ==================== time.js ====================
// 時間檢查模組
// 依賴：無
// ==================================================

let TIME = {
  ORDER_START: 800,
  ORDER_END: 1000,
  ADMIN_START: 800,
  ADMIN_END: 1200,
  RATING_START: 1200,
  RATING_END: 1600
};

function getCurrentTimeNumber() {
  const now = new Date();
  return now.getHours() * 100 + now.getMinutes();
}

function isUserOrderTime() {
  const current = getCurrentTimeNumber();
  return current >= TIME.ORDER_START && current < TIME.ORDER_END;
}

function isOrderEnded() {
  return getCurrentTimeNumber() >= TIME.ORDER_END;
}

function isAdminRestaurantTime() {
  const current = getCurrentTimeNumber();
  return current >= TIME.ADMIN_START && current < TIME.ADMIN_END;
}

function isRatingTime() {
  const current = getCurrentTimeNumber();
  return current >= TIME.RATING_START && current < TIME.RATING_END;
}

function getOrderTimeRemaining() {
  const now = getCurrentTimeNumber();
  if (now >= TIME.ORDER_END) return 0;
  if (now < TIME.ORDER_START) return TIME.ORDER_START - now;
  return TIME.ORDER_END - now;
}

function getRatingTimeRemaining() {
  const now = getCurrentTimeNumber();
  if (now >= TIME.RATING_END) return 0;
  if (now < TIME.RATING_START) return TIME.RATING_START - now;
  return TIME.RATING_END - now;
}

function formatTimeRemaining(minutes) {
  if (minutes <= 0) return '已截止';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) return `${hours}小時${mins}分鐘`;
  return `${mins}分鐘`;
}

function formatTimeHHMM(time) {
  if (Number(time) >= 2400) return '全天候';
  const hour = Math.floor(time / 100);
  const minute = time % 100;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function getOrderTimeRange() {
  return `${formatTimeHHMM(TIME.ORDER_START)} - ${formatTimeHHMM(TIME.ORDER_END)}`;
}

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
