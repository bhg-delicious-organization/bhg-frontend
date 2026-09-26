// ==================== common.js ====================
// 公共函數模組
// 依賴：js/core/state.js (AppState)
// ====================================================

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

/**
 * 關閉更改密碼模態窗
 */
function closeChangePasswordModal() {
  const modal = document.getElementById('changePasswordModal');
  if (modal) modal.classList.remove('active');
}

// 掛載到 window
window.escapeHtml = escapeHtml;
window.getAdminToken = getAdminToken;
window.getCsrfToken = getCsrfToken;
window.closeChangePasswordModal = closeChangePasswordModal;

console.log('🔧 公共函數模組已載入');
