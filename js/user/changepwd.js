// ==================== changepwd.js ====================
// 使用者修改密碼模組（Supabase Auth 版）
// 依賴：supabase.js、state.js、ui.js、common.js、core.js
// ====================================================

function loadChangePwdPage() {
  const studentId = AppState.currentStudentId();
  if (!studentId) {
    showMessageModal('❌ 錯誤', '請先登入學號');
    navigateTo('user-account');
    return;
  }

  const oldPwd = document.getElementById('changepwdOldPassword');
  const newPwd = document.getElementById('changepwdNewPassword');
  const confirmPwd = document.getElementById('changepwdConfirmPassword');
  const result = document.getElementById('changepwdResult');

  if (oldPwd) oldPwd.value = '';
  if (newPwd) newPwd.value = '';
  if (confirmPwd) confirmPwd.value = '';
  if (result) result.innerHTML = '';
}

async function submitChangePassword() {
  const oldPassword = document.getElementById('changepwdOldPassword').value;
  const newPassword = document.getElementById('changepwdNewPassword').value;
  const confirmPassword = document.getElementById('changepwdConfirmPassword').value;
  const studentId = AppState.currentStudentId();

  if (!studentId) {
    showMessageModal('❌ 錯誤', '請先登入學號');
    navigateTo('user-account');
    return;
  }

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

  const resultDiv = document.getElementById('changepwdResult');
  if (resultDiv) {
    showConanLoading('changepwdResult', 'changeMyPassword');
  }

  try {
    const sb = await initSupabase();
    const email = `${studentId}@bhg.app`;

    // 1. 先用舊密碼登入驗證
    const { error: signInError } = await sb.auth.signInWithPassword({
      email: email,
      password: oldPassword
    });

    if (signInError) {
      if (resultDiv) {
        resultDiv.innerHTML = `<div class="message error">❌ 原密碼錯誤</div>`;
      }
      return;
    }

    // 2. 更新密碼
    const { error: updateError } = await sb.auth.updateUser({
      password: newPassword
    });

    if (updateError) {
      if (resultDiv) {
        resultDiv.innerHTML = `<div class="message error">❌ ${escapeHtml(updateError.message)}</div>`;
      }
      return;
    }

    if (resultDiv) {
      resultDiv.innerHTML = `<div class="message success">✅ 密碼修改成功</div>`;
    }

    document.getElementById('changepwdOldPassword').value = '';
    document.getElementById('changepwdNewPassword').value = '';
    document.getElementById('changepwdConfirmPassword').value = '';

    setTimeout(() => {
      if (resultDiv) resultDiv.innerHTML = '';
    }, 2000);

  } catch (error) {
    console.error('修改密碼失敗:', error);
    if (resultDiv) {
      resultDiv.innerHTML = `<div class="message error">❌ ${escapeHtml(error.message)}</div>`;
    }
  }
}

window.loadChangePwdPage = loadChangePwdPage;
window.submitChangePassword = submitChangePassword;

console.log('🔑 修改密碼模組已載入（Supabase Auth 版）');
