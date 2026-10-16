// ==================== auth.js ====================
// 管理員認證模組
// 依賴：supabase.js、state.js、ui.js、common.js、core.js、navigation.js
// ====================================================

function showAdminModal() {
  if (!AppState.isAdmin()) {
    const email = document.getElementById('adminEmail');
    const pwd = document.getElementById('adminPassword');
    const msg = document.getElementById('loginMessage');
    const modal = document.getElementById('adminModal');
    if (email) email.value = '';
    if (pwd) pwd.value = '';
    if (msg) msg.innerHTML = '';
    if (modal) modal.classList.add('active');

    setTimeout(() => {
      if (email) email.focus();
      if (typeof rebindEnterKeys === 'function') rebindEnterKeys();
    }, 100);
  } else {
    adminLogout();
  }
}

function hideAdminModal() {
  const modal = document.getElementById('adminModal');
  if (modal) modal.classList.remove('active');
  if (typeof rebindEnterKeys === 'function') rebindEnterKeys();
}

async function adminLogin(event) {
  const btn = event ? event.currentTarget : null;
  const email = document.getElementById('adminEmail').value.trim();
  const password = document.getElementById('adminPassword').value;
  const messageEl = document.getElementById('loginMessage');

  if (!email || !password) {
    if (messageEl) messageEl.innerHTML = '<div class="message error">請輸入 Email 和密碼</div>';
    return;
  }

  if (btn) {
    btn._originalHTML = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 登入中...';
    btn.disabled = true;
  }

  try {
    const sb = await initSupabase();
    const { data, error } = await sb.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (btn) {
      btn.innerHTML = btn._originalHTML || '登入';
      btn.disabled = false;
    }

    if (error) {
      let errorMsg = '登入失敗';
      if (error.message.includes('Invalid login') || error.message.includes('invalid')) {
        errorMsg = 'Email 或密碼錯誤';
      } else if (error.message.includes('Email not confirmed')) {
        errorMsg = 'Email 尚未驗證';
      }
      if (messageEl) {
        messageEl.innerHTML = `<div class="message error">${errorMsg}</div>`;
      }
      return;
    }

    // 檢查是否為管理員（查 admins 表）
    const { data: adminData } = await sb
      .from('admins')
      .select('auth_uid')
      .eq('auth_uid', data.user.id)
      .maybeSingle();

    if (!adminData) {
      await sb.auth.signOut();
      if (messageEl) {
        messageEl.innerHTML = '<div class="message error">此帳號不是管理員</div>';
      }
      return;
    }

    // 登入成功
    AppState.setAdmin(true, data.session.access_token, null);

    const statusText = document.getElementById('adminStatusText');
    const statusIcon = document.getElementById('adminStatusIcon');
    if (statusText) statusText.textContent = '已登入';
    if (statusIcon) statusIcon.textContent = '✅';

    showMessageModal('✅ 成功', '管理員登入成功');
    hideAdminModal();

    // 隱藏登入頁
    const loginPage = document.getElementById('page-user-register');
    if (loginPage) loginPage.classList.remove('active');

    switchToAdminMode();

  } catch (error) {
    if (btn) {
      btn.innerHTML = btn._originalHTML || '登入';
      btn.disabled = false;
    }
    if (messageEl) {
      messageEl.innerHTML = `<div class="message error">${escapeHtml(error.message)}</div>`;
    }
  }
}

async function adminLogout() {
  try {
    const sb = await initSupabase();
    await sb.auth.signOut();
  } catch (e) {
    console.warn('登出失敗:', e);
  }

  AppState.logout();

  const statusText = document.getElementById('adminStatusText');
  const statusIcon = document.getElementById('adminStatusIcon');
  if (statusText) statusText.textContent = '管理員';
  if (statusIcon) statusIcon.textContent = '🛡️';

  updateAdminUI();
  updateNavigationVisibility();
  updateTimeModeHint();

  navigateTo('user-register');
  showMessageModal('✅ 已登出', '管理員已登出');
}

async function changeAdminPassword(event) {
  const btn = event ? event.currentTarget : null;

  const oldPassword = document.getElementById('adminOldPassword').value;
  const newPassword = document.getElementById('adminNewPassword').value;
  const confirmPassword = document.getElementById('adminConfirmPassword').value;

  if (!oldPassword || !newPassword) {
    showMessageModal('❌ 輸入錯誤', '請填寫原密碼和新密碼');
    return;
  }

  if (newPassword.length < 6) {
    showMessageModal('❌ 密碼太短', '新密碼長度至少需要6個字元');
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

  try {
    const sb = await initSupabase();
    const { data, error } = await sb.auth.updateUser({
      password: newPassword
    });

    if (btn) {
      btn.innerHTML = btn._originalHTML || '確認修改密碼';
      btn.disabled = false;
    }

    if (error) {
      if (resultDiv) {
        resultDiv.innerHTML = `<div class="message error">❌ ${escapeHtml(error.message)}</div>`;
      }
      return;
    }

    if (resultDiv) {
      resultDiv.innerHTML = `<div class="message success">✅ 密碼修改成功</div>`;
    }

    setTimeout(() => {
      document.getElementById('adminOldPassword').value = '';
      document.getElementById('adminNewPassword').value = '';
      document.getElementById('adminConfirmPassword').value = '';
      if (resultDiv) resultDiv.innerHTML = '';
    }, 2000);

  } catch (error) {
    if (btn) {
      btn.innerHTML = btn._originalHTML || '確認修改密碼';
      btn.disabled = false;
    }
    if (resultDiv) {
      resultDiv.innerHTML = `<div class="message error">❌ ${escapeHtml(error.message)}</div>`;
    }
  }
}

window.showAdminModal = showAdminModal;
window.hideAdminModal = hideAdminModal;
window.adminLogin = adminLogin;
window.adminLogout = adminLogout;
window.changeAdminPassword = changeAdminPassword;

console.log('🔐 管理員認證模組已載入');
