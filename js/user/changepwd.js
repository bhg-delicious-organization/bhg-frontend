// ==================== changepwd.js ====================
// 使用者修改密碼模組
// 依賴：api.js、state.js、ui.js、common.js、core.js
// ====================================================

/**
 * 載入修改密碼頁面
 */
function loadChangePwdPage() {
  const studentId = AppState.currentStudentId();
  if (!studentId) {
    showMessageModal('❌ 錯誤', '請先登入學號');
    navigateTo('user-account');
    return;
  }

  // 清空表單和結果
  const oldPwd = document.getElementById('changepwdOldPassword');
  const newPwd = document.getElementById('changepwdNewPassword');
  const confirmPwd = document.getElementById('changepwdConfirmPassword');
  const result = document.getElementById('changepwdResult');

  if (oldPwd) oldPwd.value = '';
  if (newPwd) newPwd.value = '';
  if (confirmPwd) confirmPwd.value = '';
  if (result) result.innerHTML = '';
}

/**
 * 提交修改密碼
 */
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

  if (newPassword.length < 4) {
    showMessageModal('❌ 密碼太短', '新密碼長度至少需要4個字元');
    return;
  }

  if (newPassword !== confirmPassword) {
    showMessageModal('❌ 輸入錯誤', '兩次輸入的新密碼不一致');
    return;
  }

  const resultDiv = document.getElementById('changepwdResult');
  if (resultDiv) {
    resultDiv.innerHTML = '<div class="loading"><div class="spinner"></div>修改中...</div>';
  }

  const result = await callApi('changeMyPassword', {
    userId: studentId,
    oldPassword: oldPassword,
    newPassword: newPassword
  });

  if (result.success) {
    if (resultDiv) {
      resultDiv.innerHTML = `<div class="message success">✅ ${escapeHtml(result.message)}</div>`;
    }

    // 清空表單
    document.getElementById('changepwdOldPassword').value = '';
    document.getElementById('changepwdNewPassword').value = '';
    document.getElementById('changepwdConfirmPassword').value = '';

    setTimeout(() => {
      if (resultDiv) resultDiv.innerHTML = '';
    }, 2000);
  } else {
    if (resultDiv) {
      resultDiv.innerHTML = `<div class="message error">❌ ${escapeHtml(result.message)}</div>`;
    }
  }
}

window.loadChangePwdPage = loadChangePwdPage;
window.submitChangePassword = submitChangePassword;

console.log('🔑 修改密碼模組已載入');
