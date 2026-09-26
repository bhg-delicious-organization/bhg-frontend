// ==================== core.js ====================
// 核心功能模組
// 依賴：state.js、ui.js、time.js、common.js、navigation.js、preload.js
// ====================================================

// ==================== 全域變數 ====================
let navHidden = false;
let lastScrollY = window.scrollY;

// ==================== Enter 鍵綁定 ====================

/**
 * 綁定單一元素的 Enter 鍵
 */
function bindEnterKey(element, callback) {
  if (!element) return;
  element.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      callback();
    }
  });
}

/**
 * 重新綁定所有 Enter 鍵
 */
function rebindEnterKeys() {
  initEnterKeyBindings();
}

/**
 * 初始化所有 Enter 鍵綁定
 */
function initEnterKeyBindings() {
  // ========== 使用者頁面 ==========
  const queryInput = document.getElementById('queryStudentId');
  if (queryInput && typeof queryUserInfo === 'function') {
    bindEnterKey(queryInput, () => queryUserInfo());
  }

  const giftCodeInput = document.getElementById('giftCode');
  const rechargeUserIdInput = document.getElementById('rechargeStudentId');
  if (giftCodeInput && typeof redeemGiftCode === 'function') {
    bindEnterKey(giftCodeInput, () => redeemGiftCode());
  }
  if (rechargeUserIdInput && typeof redeemGiftCode === 'function') {
    bindEnterKey(rechargeUserIdInput, () => redeemGiftCode());
  }

  const registerStudentId = document.getElementById('registerStudentId');
  const registerName = document.getElementById('registerName');
  if (registerStudentId) {
    bindEnterKey(registerStudentId, () => {
      if (registerName) registerName.focus();
    });
  }
  if (registerName && typeof registerUser === 'function') {
    bindEnterKey(registerName, () => registerUser());
  }

  const mealStudentId = document.getElementById('mealStudentId');
  if (mealStudentId && typeof loadMealInfo === 'function') {
    bindEnterKey(mealStudentId, () => loadMealInfo());
  }

  // ========== 學號登入模態窗 ==========
  const quickIdInput = document.getElementById('quickIdInput');
  const quickPasswordInput = document.getElementById('quickPasswordInput');
  if (quickIdInput) {
    bindEnterKey(quickIdInput, () => {
      if (quickPasswordInput) quickPasswordInput.focus();
    });
  }
  if (quickPasswordInput && typeof saveQuickId === 'function') {
    bindEnterKey(quickPasswordInput, () => saveQuickId());
  }

  // ========== 帳號頁面 ==========
  const accountLoginStudentId = document.getElementById('accountLoginStudentId');
  const accountLoginPassword = document.getElementById('accountLoginPassword');
  if (accountLoginStudentId) {
    bindEnterKey(accountLoginStudentId, () => {
      if (accountLoginPassword) accountLoginPassword.focus();
    });
  }
  if (accountLoginPassword && typeof loginFromAccount === 'function') {
    bindEnterKey(accountLoginPassword, () => loginFromAccount());
  }

  // ========== 修改密碼頁面 ==========
  const changepwdOldPassword = document.getElementById('changepwdOldPassword');
  const changepwdNewPassword = document.getElementById('changepwdNewPassword');
  const changepwdConfirmPassword = document.getElementById('changepwdConfirmPassword');

  if (changepwdOldPassword) {
    bindEnterKey(changepwdOldPassword, () => {
      if (changepwdNewPassword) changepwdNewPassword.focus();
    });
  }
  if (changepwdNewPassword) {
    bindEnterKey(changepwdNewPassword, () => {
      if (changepwdConfirmPassword) changepwdConfirmPassword.focus();
    });
  }
  if (changepwdConfirmPassword && typeof submitChangePassword === 'function') {
    bindEnterKey(changepwdConfirmPassword, () => submitChangePassword());
  }

  // ========== 管理員登入模態窗 ==========
  const adminPasswordInput = document.getElementById('adminPassword');
  if (adminPasswordInput && typeof adminLogin === 'function') {
    bindEnterKey(adminPasswordInput, () => adminLogin());
  }

  console.log('✅ Enter 鍵綁定完成');
}

// ==================== 剪貼簿 ====================

/**
 * 複製文字到剪貼簿
 */
function copyToClipboard(text) {
  return new Promise((resolve, reject) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(resolve).catch(() => {
        fallbackCopyToClipboard(text, resolve, reject);
      });
    } else {
      fallbackCopyToClipboard(text, resolve, reject);
    }
  });
}

function fallbackCopyToClipboard(text, resolve, reject) {
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    if (successful) resolve();
    else reject(new Error('複製失敗'));
  } catch (err) {
    reject(err);
  }
}

// ==================== 錯誤處理 ====================

/**
 * 回報前端錯誤到後端
 */
function reportFrontendError(functionName, error, description = '') {
  const errorMsg = error?.message || error;
  callApi('reportFrontendError', {
    functionName: functionName,
    message: errorMsg,
    description: description,
    stack: error?.stack || ''
  });
  console.error(`[前端錯誤] ${functionName}:`, error);
}

/**
 * 處理前端錯誤
 */
function handleFrontendError(functionName, error, userMessage = '操作失敗，請稍後再試') {
  reportFrontendError(functionName, error);

  if (userMessage.includes('權限不足') || userMessage.includes('請重新登入')) {
    AppState.setAdmin(false, null);
    AppState.setAdminMode(false);
    updateAdminUI();
    if (typeof showAdminModal === 'function') showAdminModal();
    return;
  }

  showMessageModal('❌ 錯誤', userMessage);
}

// ==================== 學號記憶 ====================

/**
 * 初始化記住學號功能
 */
function initRememberedId() {
  const studentId = AppState.currentStudentId();
  const btnText = document.getElementById('quickIdBtnText');
  if (btnText) btnText.textContent = studentId || '學號';
}

/**
 * 將學號填入所有學號輸入框
 */
function fillAllStudentIdInputs(studentId, setAsCurrent = false) {
  const inputs = ['queryStudentId', 'rechargeStudentId', 'deductStudentId', 'statsStudentId', 'mealStudentId', 'directRechargeUserId'];
  inputs.forEach(id => {
    const input = document.getElementById(id);
    if (input) input.value = studentId;
  });
  if (setAsCurrent) {
    AppState.setCurrentStudentId(studentId);
  }
}

// ==================== 導覽列收合 ====================

function toggleNav() {
  const activeNav = AppState.isAdminMode() ? '.admin-nav' : '.user-nav';
  const nav = document.querySelector(activeNav);
  const btn = document.getElementById('navToggleBtn');
  if (!nav || !btn) return;

  navHidden = !navHidden;
  nav.classList.toggle('hidden', navHidden);
  btn.classList.toggle('nav-hidden', navHidden);
}

function initAutoHideNav() {
  let lastScrollY = window.scrollY;

  window.addEventListener('scroll', function () {
    const currentScrollY = window.scrollY;
    const activeNav = AppState.isAdminMode() ? '.admin-nav' : '.user-nav';
    const nav = document.querySelector(activeNav);
    const btn = document.getElementById('navToggleBtn');
    if (!nav || !btn) return;

    if (currentScrollY > lastScrollY + 10 && !navHidden) {
      nav.classList.add('hidden');
      btn.classList.add('nav-hidden');
      navHidden = true;
    } else if (currentScrollY < lastScrollY - 10 && navHidden) {
      nav.classList.remove('hidden');
      btn.classList.remove('nav-hidden');
      navHidden = false;
    }

    lastScrollY = currentScrollY;
  }, { passive: true });
}

// ==================== 系統資訊 ====================

async function loadSystemInfo() {
  const result = await callApi('getSystemInfo', {});
  const el = document.getElementById('systemInfo');
  if (el && result.success) {
    el.innerHTML = `
      <p><strong>版本：</strong>${escapeHtml(result.version)}</p>
      <p><strong>開發者：</strong>${escapeHtml(result.developer)}</p>
      <p><strong>問題回報：</strong><a href="${escapeHtml(result.qaLink)}" target="_blank">📝 填寫表單</a></p>
      <p><strong>IG：</strong><a href="${escapeHtml(result.instagramLink)}" target="_blank">📷 @bhg.delicious</a></p>
    `;
  }
}

// ==================== 時間提示橫幅 ====================

function showTimeModeHint() {
  if (document.querySelector('.time-hint')) return;
  const isOrderTime = isUserOrderTime();
  const message = isOrderTime ? '🍱 點餐時間（08:00-10:00）' : '🔍 查詢時間（點餐已截止）';
  const bgColor = isOrderTime ? 'var(--success)' : 'var(--gray)';
  const header = document.querySelector('.header');
  if (!header) return;
  const hint = document.createElement('div');
  hint.className = 'time-hint';
  hint.innerHTML = `<i class="fas fa-clock"></i> ${message}`;
  hint.style.cssText = `background:${bgColor};color:white;text-align:center;padding:6px;font-size:0.9rem;margin-bottom:8px;`;
  header.parentNode.insertBefore(hint, header.nextSibling);
}

// ==================== 初始化 ====================

async function initApp() {
  console.log('🚀 系統初始化開始');

  // 1. 綁定導覽列點擊事件
  document.querySelectorAll('.bottom-nav .nav-item').forEach(item => {
    item.addEventListener('click', function(e) {
      e.preventDefault();
      const page = this.dataset.page;
      if (page) navigateTo(page);
    });
  });

  // 2. 防止表單提交
  document.querySelectorAll('form').forEach(form => {
    form.addEventListener('submit', e => { e.preventDefault(); return false; });
  });

  // 3. 綁定模式切換按鈕
  const switchToAdminBtn = document.getElementById('switchToAdminBtn');
  const switchToUserBtn = document.getElementById('switchToUserBtn');
  if (switchToAdminBtn) switchToAdminBtn.addEventListener('click', switchToAdminMode);
  if (switchToUserBtn) switchToUserBtn.addEventListener('click', switchToUserMode);

  // 4. 綁定導覽列收合按鈕
  const toggleBtn = document.getElementById('navToggleBtn');
  if (toggleBtn && !toggleBtn._navBound) {
    toggleBtn.addEventListener('click', toggleNav);
    toggleBtn._navBound = true;
  }

  // 5. 初始化
  initRememberedId();
  initAutoHideNav();

  // 6. 初始化 AppState
  const isLoggedIn = AppState.init();
  const statusText = document.getElementById('adminStatusText');
  const statusIcon = document.getElementById('adminStatusIcon');

  // 7. 執行預載入
  await runPreload();

  // 8. 判斷管理模式
  if (isLoggedIn) {
    AppState.setAdmin(true, sessionStorage.getItem('adminToken'), sessionStorage.getItem('csrfToken'));
    if (statusText) statusText.textContent = '已登入';
    if (statusIcon) statusIcon.style.color = 'var(--success)';
    updateAdminUI();
    switchToAdminMode();
  } else {
    if (statusText) statusText.textContent = '管理員';
    if (statusIcon) statusIcon.style.color = '';
    updateAdminUI();
    navigateTo(getSmartHomePage());
  }

  // 9. 顯示時間提示橫幅
  setTimeout(showTimeModeHint, 100);

  // 10. 綁定 Enter 鍵
  setTimeout(initEnterKeyBindings, 500);

  console.log('✅ 系統初始化完成');
}

// ==================== 啟動 ====================
document.addEventListener('DOMContentLoaded', initApp);

// 掛載到 window
window.initApp = initApp;
window.toggleNav = toggleNav;
window.copyToClipboard = copyToClipboard;
window.handleFrontendError = handleFrontendError;
window.fillAllStudentIdInputs = fillAllStudentIdInputs;
window.showTimeModeHint = showTimeModeHint;
window.loadSystemInfo = loadSystemInfo;

console.log('⚙️ core.js 已載入');
