// ==================== common.js ====================
// 公共函數模組
// 依賴：js/core/state.js (AppState)
// ==================================================

// ==================== 1. HTML 轉義 ====================

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ==================== 3. 模態窗輔助 ====================

function closeChangePasswordModal() {
  const modal = document.getElementById('changePasswordModal');
  if (modal) modal.classList.remove('active');
}

// ==================== 4. 柯南載入動畫 ====================

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
  'getTodayRestaurant': '正在調查今日餐廳',
  'getRestaurantCategories': '正在載入分類',
  'getCategoryItems': '正在載入餐點',
  'getOrderDetails': '正在載入訂單',

  // 管理員 API
  'verifyAdminLogin': '正在驗證管理員身分',
  'deductBalance': '正在執行扣款',
  'getBasicStats': '正在搜集統計資料',
  'changeUserId': '正在更改學號',
  'setTodayRestaurant': '正在設定餐廳',
  'cutOffOrder': '正在截止訂餐',
  'adminDirectRecharge': '正在儲值',
  'getAllBalances': '正在查詢全體餘額',
  'getLowBalanceUsers': '正在查詢低餘額名單',
  'batchDeductByCategory': '正在批量扣款',
  'getCategoryOrderers': '正在載入訂購者',

  // 預設
  'default': '線索搜集中'
};

function getLoadingMessage(action) {
  return LOADING_MESSAGES[action] || LOADING_MESSAGES['default'];
}

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

window.escapeHtml = escapeHtml;
window.closeChangePasswordModal = closeChangePasswordModal;
window.getLoadingMessage = getLoadingMessage;
window.showConanLoading = showConanLoading;

console.log('🔧 公共函數模組已載入');
