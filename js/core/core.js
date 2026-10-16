// ==================== core.js ====================
// 核心功能模組
// 依賴：state.js、ui.js、time.js、common.js、navigation.js、preload.js、supabase.js
// ==================================================

window.navHidden = false;
let lastScrollY = window.scrollY;

async function checkSupabaseAdminLogin() {
  try {
    const sb = await initSupabase();
    const { data: { session } } = await sb.auth.getSession();

    if (session && session.user) {
      const { data } = await sb
        .from('admins')
        .select('auth_uid')
        .eq('auth_uid', session.user.id)
        .maybeSingle();

      if (data) {
        AppState.setAdmin(true, session.access_token, null);
        console.log('✅ 管理員已登入:', session.user.email);
        return true;
      }
    }

    return false;
  } catch (e) {
    console.warn('檢查登入狀態失敗:', e);
    return false;
  }
}

async function checkUserSession() {
  try {
    const sb = await initSupabase();
    const { data: { session } } = await sb.auth.getSession();

    if (session && session.user) {
      const email = session.user.email || '';
      const studentId = email.split('@')[0];

      if (/^\d{6}$/.test(studentId)) {
        AppState.setCurrentStudentId(studentId);
        return { loggedIn: true, studentId };
      }
    }

    return { loggedIn: false };
  } catch (e) {
    console.warn('檢查使用者登入失敗:', e);
    return { loggedIn: false };
  }
}

// ==================== 導覽列與時間橫幅的可見性 ====================

/**
 * 統一更新導覽列與 navToggleBtn 的可見性
 */
function updateNavigationVisibility() {
  const isAdmin = AppState.isAdmin();
  const isAdminMode = AppState.isAdminMode();
  const isLoggedIn = !!AppState.currentStudentId();

  const userNav = document.querySelector('.user-nav');
  const adminNav = document.querySelector('.admin-nav');
  const toggleBtn = document.getElementById('navToggleBtn');

  // 未登入且非管理員 → 全部隱藏
  if (!isAdmin && !isLoggedIn) {
    if (userNav) userNav.style.display = 'none';
    if (adminNav) adminNav.style.display = 'none';
    if (toggleBtn) toggleBtn.style.display = 'none';
    return;
  }

  // 管理員模式
  if (isAdminMode) {
    if (userNav) userNav.style.display = 'none';
    if (adminNav) adminNav.style.display = 'flex';
    if (toggleBtn) toggleBtn.style.display = 'flex';
  } else {
    // 使用者模式
    if (userNav) userNav.style.display = 'flex';
    if (adminNav) adminNav.style.display = 'none';
    if (toggleBtn) toggleBtn.style.display = 'flex';
  }
}

/**
 * 更新時間橫幅（依登入狀態 + 時間）
 */
function updateTimeModeHint() {
  const existingHint = document.querySelector('.time-hint');
  if (existingHint) existingHint.remove();

  const isAdmin = AppState.isAdmin();
  const isLoggedIn = !!AppState.currentStudentId();

  if (!isAdmin && !isLoggedIn) return;

  showTimeModeHint();
}

/**
 * 顯示時間橫幅
 */
function showTimeModeHint() {
  if (document.querySelector('.time-hint')) return;

  const isOrderTime = isUserOrderTime();
  const timeRange = getOrderTimeRange();

  const message = isOrderTime
    ? `🍱 點餐時間（${timeRange}）`
    : `🔍 查詢時間（點餐已截止）`;

  const bgColor = isOrderTime ? 'var(--success)' : 'var(--gray)';
  const header = document.querySelector('.header');
  if (!header) return;

  const hint = document.createElement('div');
  hint.className = 'time-hint';
  hint.innerHTML = `<i class="fas fa-clock"></i> ${message}`;
  hint.style.cssText = `background:${bgColor};color:white;text-align:center;padding:6px;font-size:0.9rem;margin-bottom:8px;`;
  header.parentNode.insertBefore(hint, header.nextSibling);
}

// ==================== Enter 鍵綁定 ====================

function bindEnterKey(element, callback) {
  if (!element) return;
  element.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      callback();
    }
  });
}

function rebindEnterKeys() {
  initEnterKeyBindings();
}

function initEnterKeyBindings() {
  const queryInput = document.getElementById('queryStudentId');
  if (queryInput && typeof queryUserInfo === 'function') {
    bindEnterKey(queryInput, () => queryUserInfo());
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

  const loginStudentId = document.getElementById('loginStudentId');
  const loginPassword = document.getElementById('loginPassword');
  if (loginStudentId) {
    bindEnterKey(loginStudentId, () => {
      if (loginPassword) loginPassword.focus();
    });
  }
  if (loginPassword && typeof loginFromGate === 'function') {
    bindEnterKey(loginPassword, () => loginFromGate());
  }

  const mealStudentId = document.getElementById('mealStudentId');
  if (mealStudentId && typeof loadMealInfo === 'function') {
    bindEnterKey(mealStudentId, () => loadMealInfo());
  }

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

  const adminPasswordInput = document.getElementById('adminPassword');
  if (adminPasswordInput && typeof adminLogin === 'function') {
    bindEnterKey(adminPasswordInput, () => adminLogin());
  }

  console.log('✅ Enter 鍵綁定完成');
}

// ==================== 剪貼簿 ====================

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

function reportFrontendError(functionName, error, description = '') {
  const errorMsg = error?.message || error;

  (async () => {
    try {
      const sb = await initSupabase();
      await sb.from('error_logs').insert({
        source: '前端',
        function_name: functionName,
        error_type: 'Error',
        error_message: String(errorMsg).substring(0, 500),
        description: description
      });
    } catch (e) {
      console.warn('上報錯誤失敗:', e);
    }
  })();

  console.error(`[前端錯誤] ${functionName}:`, error);
}

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

// ==================== 學號相關 ====================

function fillAllStudentIdInputs(studentId, setAsCurrent = false) {
  const inputs = ['queryStudentId', 'deductStudentId', 'statsStudentId', 'mealStudentId', 'directRechargeUserId'];
  inputs.forEach(id => {
    const input = document.getElementById(id);
    if (input) input.value = studentId;
  });
  if (setAsCurrent) {
    AppState.setCurrentStudentId(studentId);
  }
}

// ==================== 導覽列 ====================

function toggleNav() {
  const activeNav = AppState.isAdminMode() ? '.admin-nav' : '.user-nav';
  const nav = document.querySelector(activeNav);
  const btn = document.getElementById('navToggleBtn');
  if (!nav || !btn) return;

  window.navHidden = !window.navHidden;
  nav.classList.toggle('hidden', window.navHidden);
  btn.classList.toggle('nav-hidden', window.navHidden);
}

function initAutoHideNav() {
  let lastScrollY = window.scrollY;

  window.addEventListener('scroll', function () {
    const currentScrollY = window.scrollY;
    const activeNav = AppState.isAdminMode() ? '.admin-nav' : '.user-nav';
    const nav = document.querySelector(activeNav);
    const btn = document.getElementById('navToggleBtn');
    if (!nav || !btn) return;

    if (currentScrollY > lastScrollY + 10 && !window.navHidden) {
      nav.classList.add('hidden');
      btn.classList.add('nav-hidden');
      window.navHidden = true;
    } else if (currentScrollY < lastScrollY - 10 && window.navHidden) {
      nav.classList.remove('hidden');
      btn.classList.remove('nav-hidden');
      window.navHidden = false;
    }

    lastScrollY = currentScrollY;
  }, { passive: true });
}

// ==================== 系統資訊 ====================

async function loadSystemInfo() {
  const el = document.getElementById('systemInfo');
  if (!el) return;

  el.innerHTML = '<div class="loading"><div class="spinner"></div><p>載入中...</p></div>';

  try {
    const sb = await initSupabase();

    const { data, error } = await sb
      .from('system_settings')
      .select('key, value')
      .in('key', ['version', 'developer', 'qa_link', 'instagram_link']);

    if (error) {
      el.innerHTML = `<div class="message error">❌ ${escapeHtml(error.message)}</div>`;
      return;
    }

    const settings = {};
    data.forEach(item => { settings[item.key] = item.value; });

    el.innerHTML = `
      <p><strong>版本：</strong>${escapeHtml(settings.version || '未知')}</p>
      <p><strong>開發者：</strong>${escapeHtml(settings.developer || '未知')}</p>
      <p><strong>問題回報：</strong><a href="${escapeHtml(settings.qa_link || '#')}" target="_blank">📝 填寫表單</a></p>
      <p><strong>IG：</strong><a href="${escapeHtml(settings.instagram_link || '#')}" target="_blank">📷 @bhg.delicious</a></p>
    `;
  } catch (e) {
    el.innerHTML = `<div class="message error">❌ ${escapeHtml(e.message)}</div>`;
  }
}

// ==================== 使用者資料預載 ====================

async function preloadUserData(studentId) {
  if (!studentId) return null;

  try {
    const sb = await initSupabase();

    const [userRes, mealsRes, transRes] = await Promise.allSettled([
      sb.from('users').select('name, balance').eq('user_id', studentId).maybeSingle(),
      sb.from('today_meals')
        .select('slot, restaurant, category, meal_name, amount, price, rated')
        .eq('user_id', studentId)
        .order('slot'),
      sb.from('transactions')
        .select('*')
        .eq('user_id', studentId)
        .order('created_at', { ascending: false })
        .limit(5)
    ]);

    const data = {
      user: userRes.status === 'fulfilled' ? userRes.value.data : null,
      meals: mealsRes.status === 'fulfilled' ? (mealsRes.value.data || []) : [],
      transactions: transRes.status === 'fulfilled' ? (transRes.value.data || []) : [],
      loadedAt: Date.now()
    };

    AppState.setUserData(data);
    console.log('✅ 使用者資料已預載:', data);
    return data;
  } catch (error) {
    console.error('預載使用者資料失敗:', error);
    return null;
  }
}

async function refreshUserData(studentId) {
  return preloadUserData(studentId);
}

// ==================== 系統初始化 ====================

async function initApp() {
  console.log('🚀 系統初始化開始');

  if (typeof cleanupOldRestaurantCache === 'function') {
    cleanupOldRestaurantCache();
  }

  document.querySelectorAll('.bottom-nav .nav-item').forEach(item => {
    item.addEventListener('click', function(e) {
      e.preventDefault();
      const page = this.dataset.page;
      if (page) navigateTo(page);
    });
  });

  document.querySelectorAll('form').forEach(form => {
    form.addEventListener('submit', e => { e.preventDefault(); return false; });
  });

  const switchToAdminBtn = document.getElementById('switchToAdminBtn');
  const switchToUserBtn = document.getElementById('switchToUserBtn');
  if (switchToAdminBtn) switchToAdminBtn.addEventListener('click', switchToAdminMode);
  if (switchToUserBtn) switchToUserBtn.addEventListener('click', switchToUserMode);

  const toggleBtn = document.getElementById('navToggleBtn');
  if (toggleBtn && !toggleBtn._navBound) {
    toggleBtn.addEventListener('click', toggleNav);
    toggleBtn._navBound = true;
  }

  initAutoHideNav();
  AppState.init();
  setupPageLoadedListener();

  const isAdminLoggedIn = await checkSupabaseAdminLogin();

  let userSession = { loggedIn: false };
  if (!isAdminLoggedIn) {
    userSession = await checkUserSession();
  }

  const statusText = document.getElementById('adminStatusText');
  const statusIcon = document.getElementById('adminStatusIcon');

  const loginPage = document.getElementById('page-user-register');

  if (isAdminLoggedIn) {
    // ========== 管理員模式 ==========
    if (loginPage) loginPage.classList.remove('active');

    if (statusText) statusText.textContent = '已登入';
    if (statusIcon) statusIcon.textContent = '✅';
    updateAdminUI();

    await ensureTimeLimitsLoaded();
    await ensureTodayRestaurantLoaded().then(() => {
      const restaurantName = AppState.currentRestaurantName();
      if (restaurantName) loadRestaurantMenu(restaurantName);
    });

    AppState.setAdminMode(true);
    updateNavigationVisibility();
    updateTimeModeHint();

    navigateTo(isAdminRestaurantTime() ? 'admin-restaurant' : 'admin-query');

    setTimeout(() => preloadAllPages(), 3000);

  } else if (userSession.loggedIn) {
    // ========== 使用者已登入 ==========
    if (loginPage) loginPage.classList.remove('active');

    if (statusText) statusText.textContent = '管理員';
    if (statusIcon) statusIcon.textContent = '🛡️';
    updateAdminUI();

    await ensureTimeLimitsLoaded();
    await ensureTodayRestaurantLoaded().then(() => {
      const restaurantName = AppState.currentRestaurantName();
      if (restaurantName) loadRestaurantMenu(restaurantName);
    });

    updateNavigationVisibility();
    updateTimeModeHint();

    preloadUserData(userSession.studentId).catch(e => {
      console.warn('預載使用者資料失敗:', e);
    });

    await navigateTo(getSmartHomePage());

    setTimeout(() => preloadAllPages(), 3000);

  } else {
    // ========== 未登入 ==========
    if (statusText) statusText.textContent = '管理員';
    if (statusIcon) statusIcon.textContent = '🛡️';

    updateNavigationVisibility();
    updateTimeModeHint();

    if (typeof initRegisterPage === 'function') initRegisterPage();

    document.querySelectorAll('.bottom-nav .nav-item').forEach(item => {
      item.classList.remove('active');
    });
  }

  setTimeout(initEnterKeyBindings, 500);
  setInterval(updateTimeModeHint, 60000);
  console.log('✅ 系統初始化完成');
}

document.addEventListener('DOMContentLoaded', initApp);

window.initApp = initApp;
window.toggleNav = toggleNav;
window.copyToClipboard = copyToClipboard;
window.handleFrontendError = handleFrontendError;
window.fillAllStudentIdInputs = fillAllStudentIdInputs;
window.showTimeModeHint = showTimeModeHint;
window.updateTimeModeHint = updateTimeModeHint;
window.updateNavigationVisibility = updateNavigationVisibility;
window.loadSystemInfo = loadSystemInfo;
window.checkSupabaseAdminLogin = checkSupabaseAdminLogin;
window.checkUserSession = checkUserSession;
window.preloadUserData = preloadUserData;
window.refreshUserData = refreshUserData;

console.log('⚙️ core.js 已載入');
