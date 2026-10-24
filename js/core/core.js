// ==================== core.js ====================
// 核心功能模組
// 依賴：state.js、ui.js、time.js、common.js、navigation.js、preload.js、supabase.js
// ====================================================

window.navHidden = false;
let lastScrollY = window.scrollY;

async function checkSupabaseAdminLogin() {
  try {
    const sb = await initSupabase();
    const { data: { session } } = await sb.auth.getSession();

    if (!session || !session.user) {
      return false;
    }

    const expiresAt = session.expires_at;
    if (expiresAt && expiresAt * 1000 < Date.now()) {
      console.warn('⚠️ 管理員 session 已過期，登出');
      await sb.auth.signOut();
      return false;
    }

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

    if (!session || !session.user) {
      return { loggedIn: false };
    }

    const expiresAt = session.expires_at;
    if (expiresAt && expiresAt * 1000 < Date.now()) {
      console.warn('⚠️ Session 已過期，登出');
      await sb.auth.signOut();
      return { loggedIn: false };
    }

    const email = session.user.email || '';
    const studentId = email.split('@')[0];

    if (!/^\d{6}$/.test(studentId)) {
      return { loggedIn: false };
    }

    const { data: userData, error: userError } = await sb
      .from('users')
      .select('user_id, name')
      .eq('user_id', studentId)
      .maybeSingle();

    if (userError || !userData) {
      console.warn('⚠️ Session 有效但 users 表無對應資料');
      await sb.auth.signOut();
      return { loggedIn: false, reason: 'no_user_data' };
    }

    AppState.setCurrentStudentId(studentId);
    return { loggedIn: true, studentId, name: userData.name };

  } catch (e) {
    console.warn('檢查使用者登入失敗:', e);
    return { loggedIn: false };
  }
}

// ==================== 導覽列可見性 ====================

function updateNavigationVisibility() {
  const isAdmin = AppState.isAdmin();
  const isAdminMode = AppState.isAdminMode();
  const isLoggedIn = !!AppState.currentStudentId();

  const userNav = document.querySelector('.user-nav');
  const adminNav = document.querySelector('.admin-nav');
  const toggleBtn = document.getElementById('navToggleBtn');

  if (!isAdmin && !isLoggedIn) {
    if (userNav) userNav.style.display = 'none';
    if (adminNav) adminNav.style.display = 'none';
    if (toggleBtn) toggleBtn.style.display = 'none';
    return;
  }

  if (isAdminMode) {
    if (userNav) userNav.style.display = 'none';
    if (adminNav) adminNav.style.display = 'flex';
    if (toggleBtn) toggleBtn.style.display = 'flex';
  } else {
    if (userNav) userNav.style.display = 'flex';
    if (adminNav) adminNav.style.display = 'none';
    if (toggleBtn) toggleBtn.style.display = 'flex';
  }
}

// ==================== Enter 鍵綁定（事件委派版） ====================

const ENTER_KEY_ACTIONS = {
  // 使用者端
  'queryStudentId': () => { if (typeof queryUserInfo === 'function') queryUserInfo(); },
  'registerStudentId': () => document.getElementById('registerName')?.focus(),
  'registerName': () => { if (typeof registerUser === 'function') registerUser(); },
  'loginStudentId': () => document.getElementById('loginPassword')?.focus(),
  'loginPassword': () => { if (typeof loginFromGate === 'function') loginFromGate(); },
  'mealStudentId': () => { if (typeof loadMealInfo === 'function') loadMealInfo(); },
  
  // 修改密碼
  'changepwdOldPassword': () => document.getElementById('changepwdNewPassword')?.focus(),
  'changepwdNewPassword': () => document.getElementById('changepwdConfirmPassword')?.focus(),
  'changepwdConfirmPassword': () => { if (typeof submitChangePassword === 'function') submitChangePassword(); },

  // 管理員端
  'adminEmail': () => document.getElementById('adminPassword')?.focus(),
  'adminPassword': () => { if (typeof adminLogin === 'function') adminLogin(); },
};

function setupGlobalEnterKey() {
  if (window._globalEnterKeyBound) return;
  window._globalEnterKeyBound = true;

  document.addEventListener('keydown', function(e) {
    if (e.key !== 'Enter') return;
    if (e.target.tagName === 'TEXTAREA') return;

    const action = ENTER_KEY_ACTIONS[e.target.id];
    
    if (action) {
      e.preventDefault();
      action();
    }
  });

  console.log('✅ 全域 Enter 鍵事件委派已綁定');
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

    AppState.setUserData(studentId, data);
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

  setupGlobalEnterKey();

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

  const toggleBtn = document.getElementById('navToggleBtn');
  if (toggleBtn && !toggleBtn._navBound) {
    toggleBtn.addEventListener('click', toggleNav);
    toggleBtn._navBound = true;
  }

  initAutoHideNav();
  AppState.init();

  AppState.subscribe('studentId', () => updateNavigationVisibility());
  AppState.subscribe('admin', () => updateNavigationVisibility());
  AppState.subscribe('adminMode', () => updateNavigationVisibility());

  setupPageLoadedListener();

  if (typeof bindLoginForm === 'function') bindLoginForm();
  if (typeof bindRegisterForm === 'function') bindRegisterForm();

  const isAdminLoggedIn = await checkSupabaseAdminLogin();

  let userSession = { loggedIn: false };
  if (!isAdminLoggedIn) {
    userSession = await checkUserSession();
  
    if (!userSession.loggedIn) {
      const staleStudentId = localStorage.getItem('currentStudentId');
      if (staleStudentId) {
        console.warn('⚠️ Session 無效，清除 localStorage 的學號:', staleStudentId);
        AppState.setCurrentStudentId('');
      }
    }
  }

  const statusText = document.getElementById('adminStatusText');
  const statusIcon = document.getElementById('adminStatusIcon');

  const loginPage = document.getElementById('page-user-register');

  if (isAdminLoggedIn) {
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

    navigateTo(isAdminRestaurantTime() ? 'admin-operations' : 'admin-analytics');

    setTimeout(() => preloadAllPages(), 3000);

  } else if (userSession.loggedIn) {
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

    preloadUserData(userSession.studentId).catch(e => {
      console.warn('預載使用者資料失敗:', e);
    });

    await navigateTo(getSmartHomePage());

    setTimeout(() => preloadAllPages(), 3000);

  } else {
    if (statusText) statusText.textContent = '管理員';
    if (statusIcon) statusIcon.textContent = '🛡️';

    updateNavigationVisibility();

    if (typeof initRegisterPage === 'function') initRegisterPage();

    document.querySelectorAll('.bottom-nav .nav-item').forEach(item => {
      item.classList.remove('active');
    });
  }

  console.log('✅ 系統初始化完成');
}

// ═══════════════════════════════════════════════════════════════
// Sprint 2.6：RPC 回傳格式斷言
// ═══════════════════════════════════════════════════════════════

function assertRpcSuccess(data, name) {
  if (!data || typeof data !== 'object' || !('success' in data)) {
    throw new Error(`RPC ${name} 回傳格式異常（缺少 success 欄位）`);
  }
  if (!data.success) {
    throw new Error(data.message || `RPC ${name} 失敗`);
  }
  return data;
}

document.addEventListener('DOMContentLoaded', initApp);

window.assertRpcSuccess = assertRpcSuccess;
window.initApp = initApp;
window.toggleNav = toggleNav;
window.copyToClipboard = copyToClipboard;
window.handleFrontendError = handleFrontendError;
window.fillAllStudentIdInputs = fillAllStudentIdInputs;
window.updateNavigationVisibility = updateNavigationVisibility;
window.loadSystemInfo = loadSystemInfo;
window.checkSupabaseAdminLogin = checkSupabaseAdminLogin;
window.checkUserSession = checkUserSession;
window.preloadUserData = preloadUserData;
window.refreshUserData = refreshUserData;

console.log('⚙️ core.js 已載入');
