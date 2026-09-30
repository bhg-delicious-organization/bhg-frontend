// ==================== quick-id.js ====================
// 學號登入管理模組
// 依賴：api.js、state.js、ui.js、common.js
// ====================================================

/**
 * 顯示學號管理模態窗
 */
function showQuickIdModal() {
  const isLoggedIn = !!AppState.currentStudentId();
  const notLoggedInDiv = document.getElementById('quickIdNotLoggedIn');
  const loggedInDiv = document.getElementById('quickIdLoggedIn');
  const footerNotLoggedIn = document.getElementById('quickIdFooterNotLoggedIn');
  const footerLoggedIn = document.getElementById('quickIdFooterLoggedIn');

  if (isLoggedIn) {
    if (notLoggedInDiv) notLoggedInDiv.style.display = 'none';
    if (loggedInDiv) loggedInDiv.style.display = 'block';
    if (footerNotLoggedIn) footerNotLoggedIn.style.display = 'none';
    if (footerLoggedIn) footerLoggedIn.style.display = 'flex';

    const currentStudentSpan = document.getElementById('quickIdCurrentStudent');
    if (currentStudentSpan) {
      currentStudentSpan.textContent = AppState.currentStudentId();
    }
    const msgDiv = document.getElementById('quickIdLoggedInMessage');
    if (msgDiv) msgDiv.innerHTML = '';
  } else {
    if (notLoggedInDiv) notLoggedInDiv.style.display = 'block';
    if (loggedInDiv) loggedInDiv.style.display = 'none';
    if (footerNotLoggedIn) footerNotLoggedIn.style.display = 'flex';
    if (footerLoggedIn) footerLoggedIn.style.display = 'none';

    const studentIdInput = document.getElementById('quickIdInput');
    const passwordInput = document.getElementById('quickPasswordInput');
    if (studentIdInput) studentIdInput.value = AppState.currentStudentId() || '';
    if (passwordInput) passwordInput.value = '';
    const msgDiv = document.getElementById('quickIdMessage');
    if (msgDiv) msgDiv.innerHTML = '';
  }

  const modal = document.getElementById('quickIdModal');
  if (modal) modal.classList.add('active');

  setTimeout(() => {
    if (!isLoggedIn) {
      const input = document.getElementById('quickIdInput');
      if (input) input.focus();
    }
    if (typeof rebindEnterKeys === 'function') rebindEnterKeys();
  }, 100);
}

/**
 * 關閉學號管理模態窗
 */
function hideQuickIdModal() {
  const modal = document.getElementById('quickIdModal');
  if (modal) modal.classList.remove('active');
  if (typeof rebindEnterKeys === 'function') rebindEnterKeys();
}

/**
 * 儲存學號（登入）
 */
async function saveQuickId() {
  const studentId = document.getElementById('quickIdInput').value.trim();
  const password = document.getElementById('quickPasswordInput').value;
  const msgDiv = document.getElementById('quickIdMessage');

  if (!studentId || !/^\d{6}$/.test(studentId)) {
    if (msgDiv) msgDiv.innerHTML = '<div class="message error">請輸入6位數學號</div>';
    return;
  }

  if (msgDiv) msgDiv.innerHTML = '<div class="loading"><div class="spinner"></div>驗證中...</div>';

  const result = await callApi('verifyUserPassword', {
    userId: studentId,
    password: password
  });

  if (msgDiv) msgDiv.innerHTML = '';

  if (result.success) {
    AppState.setCurrentStudentId(studentId);
    fillAllStudentIdInputs(studentId, true);
    hideQuickIdModal();
    showMessageModal('✅ 登入成功', `歡迎回來，${result.name}`);
    if (typeof loadAccountPage === 'function') loadAccountPage();
  } else {
    if (msgDiv) msgDiv.innerHTML = `<div class="message error">${escapeHtml(result.message)}</div>`;
  }
}

/**
 * 清除記住的學號
 */
function clearRememberedId() {
  AppState.setCurrentStudentId('');
  const btnText = document.getElementById('quickIdBtnText');
  if (btnText) btnText.textContent = '學號';
  fillAllStudentIdInputs('');
  hideQuickIdModal();
  showMessageModal('✅ 已登出', '您已成功登出');
  if (typeof loadAccountPage === 'function') loadAccountPage();
}

/**
 * 從學號模態窗登出
 */
function logoutFromQuickModal() {
  AppState.setCurrentStudentId('');

  const inputs = ['queryStudentId', 'rechargeStudentId', 'deductStudentId', 'statsStudentId', 'mealStudentId', 'directRechargeUserId'];
  inputs.forEach(id => {
    const input = document.getElementById(id);
    if (input) input.value = '';
  });

  hideQuickIdModal();
  showMessageModal('✅ 已登出', '您已成功登出');
  if (typeof loadAccountPage === 'function') loadAccountPage();
}

window.showQuickIdModal = showQuickIdModal;
window.hideQuickIdModal = hideQuickIdModal;
window.saveQuickId = saveQuickId;
window.clearRememberedId = clearRememberedId;
window.logoutFromQuickModal = logoutFromQuickModal;

console.log('🔑 學號管理模組已載入');
