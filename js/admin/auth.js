// ==================== auth.js ====================
// 管理員認證模組
// 依賴：api.js、state.js、ui.js、common.js、core.js、navigation.js
// ====================================================

/**
 * 顯示管理員登入模態窗
 */
function showAdminModal() {
  if (!AppState.isAdmin()) {
    const pwd = document.getElementById('adminPassword');
    const msg = document.getElementById('loginMessage');
    const modal = document.getElementById('adminModal');
    if (pwd) pwd.value = '';
    if (msg) msg.innerHTML = '';
    if (modal) modal.classList.add('active');

    setTimeout(() => {
      if (pwd) pwd.focus();
      if (typeof rebindEnterKeys === 'function') rebindEnterKeys();
    }, 100);
  } else {
    adminLogout();
  }
}

/**
 * 關閉管理員登入模態窗
 */
function hideAdminModal() {
  const modal = document.getElementById('adminModal');
  if (modal) modal.classList.remove('active');
  if (typeof rebindEnterKeys === 'function') rebindEnterKeys();
}

/**
 * 管理員登入
 */
async function adminLogin(event) {
  const btn = event ? event.currentTarget : null;
  const password = document.getElementById('adminPassword').value.trim();
  const messageEl = document.getElementById('loginMessage');

  if (!password) {
    if (messageEl) messageEl.innerHTML = '<div class="message error">請輸入密碼</div>';
    return;
  }

  if (btn) {
    btn._originalHTML = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 登入中...';
    btn.disabled = true;
  }

  if (messageEl) {
    showConanLoading('loginMessage', 'verifyAdminLogin');
  }

  const result = await callApi('verifyAdminLogin', { password: password });

  if (btn) {
    btn.innerHTML = btn._originalHTML || '登入';
    btn.disabled = false;
  }

  if (result.success) {
    AppState.setAdmin(true, result.token, result.csrfToken);

    const statusText = document.getElementById('adminStatusText');
    const statusIcon = document.getElementById('adminStatusIcon');
    if (statusText) statusText.textContent = '已登入';
    if (statusIcon) {
      statusIcon.classList.add('fa-user-shield');
      statusIcon.style.color = 'var(--success)';
    }

    showMessageModal('✅ 成功', '管理員登入成功');
    hideAdminModal();
    switchToAdminMode();
  } else {
    if (messageEl) messageEl.innerHTML = `<div class="message error">${escapeHtml(result.message || '登入失敗')}</div>`;
  }
}

/**
 * 管理員登出
 */
function adminLogout() {
  AppState.logout();
  AppState.setAdminMode(false);

  const statusText = document.getElementById('adminStatusText');
  const statusIcon = document.getElementById('adminStatusIcon');
  if (statusText) statusText.textContent = '管理員';
  if (statusIcon) {
    statusIcon.classList.add('fa-user-shield');
    statusIcon.style.color = 'white';
  }

  updateAdminUI();

  const userNav = document.querySelector('.user-nav');
  const adminNav = document.querySelector('.admin-nav');
  const toggleBtn = document.getElementById('navToggleBtn');
  if (adminNav) adminNav.style.display = 'none';
  if (userNav) userNav.style.display = 'flex';
  if (toggleBtn) toggleBtn.style.display = 'flex';

  navigateTo(getSmartHomePage());
  showMessageModal('✅ 已登出', '管理員已登出');
}

/**
 * 管理員更改密碼
 */
async function changeAdminPassword(event) {
  const btn = event ? event.currentTarget : null;

  const oldPassword = document.getElementById('adminOldPassword').value;
  const newPassword = document.getElementById('adminNewPassword').value;
  const confirmPassword = document.getElementById('adminConfirmPassword').value;

  if (!oldPassword || !newPassword) {
    showMessageModal('❌ 輸入錯誤', '請填寫原密碼和新密碼');
    return;
  }

  if (newPassword.length < 4) {
    showMessageModal('❌ 密碼太短', '新密碼長度至少需要4個字元');
    return;
  }

  if (newPassword !== confirmPassword) {
    showMessageModal('❌ 輸入錯誤', '兩次輸入的新密碼不一致');
    return;
  }

  const resultDiv = document.getElementById('adminPasswordResult');

  if (btn) {
    btn._originalHTML = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 修改中...';
    btn.disabled = true;
  }

  if (resultDiv) {
    showConanLoading('adminPasswordResult', 'changeMyPassword');
  }

  const result = await callAdminApi('changeAdminPassword', {
    oldPassword: oldPassword,
    newPassword: newPassword
  });

  if (btn) {
    btn.innerHTML = btn._originalHTML || '確認修改密碼';
    btn.disabled = false;
  }

  if (result.success) {
    if (resultDiv) resultDiv.innerHTML = `<div class="message success">✅ ${escapeHtml(result.message)}</div>`;
    setTimeout(() => {
      document.getElementById('adminOldPassword').value = '';
      document.getElementById('adminNewPassword').value = '';
      document.getElementById('adminConfirmPassword').value = '';
      if (resultDiv) resultDiv.innerHTML = '';
    }, 2000);
  } else {
    if (resultDiv) resultDiv.innerHTML = `<div class="message error">❌ ${escapeHtml(result.message)}</div>`;
  }
}

window.showAdminModal = showAdminModal;
window.hideAdminModal = hideAdminModal;
window.adminLogin = adminLogin;
window.adminLogout = adminLogout;
window.changeAdminPassword = changeAdminPassword;

console.log('🔐 管理員認證模組已載入');
