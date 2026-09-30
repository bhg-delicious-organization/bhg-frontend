// ==================== common.js ====================
// 公共函數模組
// 依賴：js/core/state.js (AppState)
// ====================================================

// ==================== 1. HTML 轉義 ====================

/**
 * HTML 轉義（防止 XSS 攻擊）
 * @param {string} str - 要轉義的字串
 * @returns {string} 轉義後的字串
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ==================== 2. Token 取得 ====================

/**
 * 獲取管理員 Token
 * @returns {string|null} 管理員 Token
 */
function getAdminToken() {
  if (typeof AppState !== 'undefined' && AppState.adminToken) {
    return AppState.adminToken();
  }
  return null;
}

/**
 * 獲取 CSRF Token
 * @returns {string|null} CSRF Token
 */
function getCsrfToken() {
  if (typeof AppState !== 'undefined' && AppState.csrfToken) {
    return AppState.csrfToken();
  }
  return null;
}

// ==================== 3. 模態窗輔助 ====================

/**
 * 關閉更改密碼模態窗
 */
function closeChangePasswordModal() {
  const modal = document.getElementById('changePasswordModal');
  if (modal) modal.classList.remove('active');
}

// ==================== 4. 柯南載入動畫 ====================

/**
 * 載入訊息對照表
 */
const LOADING_MESSAGES = {
  // 使用者 API
  'getUserBalance': '正在查詢餘額',
  'getTransactionHistory': '正在調閱交易紀錄',
  'registerUser': '正在建立檔案',
  'verifyUserPassword': '正在推理你的身分',
  'changeMyPassword': '正在更新密碼',
  'getUserTodayMeals': '正在調查今日餐點',
  'saveUserMeal': '正在登記餐點',
  'rateMeal': '正在記錄評價',
  'redeemGiftCode': '正在驗證禮包碼',
  'getTodayRestaurant': '正在調查今日餐廳',
  'getRestaurantCategories': '正在載入分類',
  'getCategoryItems': '正在載入餐點',
  'getOrderDetails': '正在載入訂單',

  // 管理員 API
  'verifyAdminLogin': '正在驗證管理員身分',
  'generateGiftCode': '正在產生禮包碼',
  'deductBalance': '正在執行扣款',
  'getBasicStats': '正在搜集統計資料',
  'changeUserId': '正在更改學號',
  'setTodayRestaurant': '正在設定餐廳',
  'cutOffOrder': '正在截止訂餐',
  'adminDirectRecharge': '正在儲值',
  'getAllBalances': '正在查詢全體餘額',
  'getLowBalanceUsers': '正在查詢低餘額名單',
  'getRecentGiftCodes': '正在載入禮包碼',
  'batchDeductByCategory': '正在批量扣款',
  'getCategoryOrderers': '正在載入訂購者',

  // 預設
  'default': '線索搜集中'
};

/**
 * 取得載入訊息
 * @param {string} action - API 動作名稱
 * @returns {string} 載入訊息
 */
function getLoadingMessage(action) {
  return LOADING_MESSAGES[action] || LOADING_MESSAGES['default'];
}

/**
 * 顯示柯南載入動畫
 * @param {string} elementId - 目標元素 ID
 * @param {string} action - API 動作名稱
 */
function showConanLoading(elementId, action = 'default') {
  const el = document.getElementById(elementId);
  if (!el) return;

  const text = getLoadingMessage(action);
  el.innerHTML = `
    <div class="loading-conan">
      <img src="assets/conan.png" alt="載入中" class="conan-img">
      <div class="loading-text">${text}...</div>
      <div class="loading-dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  `;
}

// ==================== 5. 掛載到 window ====================

// HTML 轉義
window.escapeHtml = escapeHtml;

// Token
window.getAdminToken = getAdminToken;
window.getCsrfToken = getCsrfToken;

// 模態窗
window.closeChangePasswordModal = closeChangePasswordModal;

// 柯南載入動畫
window.getLoadingMessage = getLoadingMessage;
window.showConanLoading = showConanLoading;

console.log('🔧 公共函數模組已載入');
