// ==================== account.js ====================
// 使用者帳號管理模組
// 依賴：api.js、state.js、ui.js、common.js、core.js
// ====================================================

/**
 * 載入帳號頁面
 */
async function loadAccountPage() {
  const studentId = AppState.currentStudentId();
  const notLoggedInDiv = document.getElementById('accountNotLoggedIn');
  const loggedInDiv = document.getElementById('accountLoggedIn');

  if (!notLoggedInDiv || !loggedInDiv) return;

  if (!studentId) {
    // 未登入狀態
    notLoggedInDiv.style.display = 'block';
    loggedInDiv.style.display = 'none';

    const input = document.getElementById('accountLoginStudentId');
    const errorDiv = document.getElementById('accountLoginError');
    if (input) input.value = '';
    if (errorDiv) errorDiv.innerHTML = '';
  } else {
    // 已登入狀態
    notLoggedInDiv.style.display = 'none';
    loggedInDiv.style.display = 'block';

    // 顯示學號
    const studentIdEl = document.getElementById('accountStudentId');
    if (studentIdEl) studentIdEl.textContent = studentId;

    // 顯示柯南載入動畫
    showConanLoading('accountUserName', 'getUserBalance');

    // 載入姓名與餘額
    const balanceResult = await callApi('getUserBalance', { userId: studentId });
    const userNameEl = document.getElementById('accountUserName');
    if (balanceResult.success) {
      if (userNameEl) userNameEl.textContent = balanceResult.name;
    } else {
      if (userNameEl) userNameEl.textContent = '查無資料';
    }

    // 載入總消費
    const spentResult = await callApi('getUserTotalSpent', { userId: studentId });
    const totalSpentEl = document.getElementById('accountTotalSpent');
    if (spentResult.success) {
      if (totalSpentEl) totalSpentEl.textContent = `$${spentResult.total}`;
    } else {
      if (totalSpentEl) totalSpentEl.textContent = '計算失敗';
    }
  }
}

/**
 * 從帳號頁面登入
 */
async function loginFromAccount() {
  const studentId = document.getElementById('accountLoginStudentId').value.trim();
  const password = document.getElementById('accountLoginPassword').value;
  const errorDiv = document.getElementById('accountLoginError');

  if (!studentId || !/^\d{6}$/.test(studentId)) {
    if (errorDiv) errorDiv.innerHTML = '<div class="message error">請輸入6位數學號</div>';
    return;
  }

  if (errorDiv) {
    showConanLoading('accountLoginError', 'verifyUserPassword');
  }

  const result = await callApi('verifyUserPassword', {
    userId: studentId,
    password: password
  });

  if (errorDiv) errorDiv.innerHTML = '';

  if (result.success) {
    AppState.setCurrentStudentId(studentId);
    fillAllStudentIdInputs(studentId, true);
    loadAccountPage();
  } else {
    if (errorDiv) errorDiv.innerHTML = `<div class="message error">${escapeHtml(result.message)}</div>`;
  }
}

/**
 * 從帳號頁面登出
 */
function logoutFromAccount() {
  AppState.setCurrentStudentId('');

  const inputs = ['queryStudentId', 'rechargeStudentId', 'deductStudentId', 'statsStudentId', 'mealStudentId', 'directRechargeUserId'];
  inputs.forEach(id => {
    const input = document.getElementById(id);
    if (input) input.value = '';
  });

  showMessageModal('✅ 已登出', '您已成功登出');
  loadAccountPage();
}

window.loadAccountPage = loadAccountPage;
window.loginFromAccount = loginFromAccount;
window.logoutFromAccount = logoutFromAccount;

console.log('👤 帳號模組已載入');
