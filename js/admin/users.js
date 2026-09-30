// ==================== users.js ====================
// 管理員用戶管理模組
// 依賴：api.js、state.js、ui.js、common.js、core.js
// ====================================================

/**
 * 確認更改學號（彈出確認視窗）
 */
function confirmChangeUserId() {
  const oldUserId = document.getElementById('changeOldUserId').value.trim();
  const newUserId = document.getElementById('changeNewUserId').value.trim();

  if (!/^\d{6}$/.test(oldUserId)) {
    showMessageModal('❌ 輸入錯誤', '原學號必須是6位數字');
    return;
  }
  if (!/^\d{6}$/.test(newUserId)) {
    showMessageModal('❌ 輸入錯誤', '新學號必須是6位數字');
    return;
  }
  if (oldUserId === newUserId) {
    showMessageModal('⚠️ 提醒', '新學號不能與原學號相同');
    return;
  }

  showConfirmModal(
    '⚠️ 確認更改學號',
    `確定要將 ${oldUserId} 改為 ${newUserId} 嗎？\n\n` +
    `此操作會更新使用者資料、交易紀錄與訂單歷史。\n` +
    `此操作無法復原！`,
    function() { changeUserId(oldUserId, newUserId); }
  );
}

/**
 * 執行更改學號
 */
async function changeUserId(oldUserId, newUserId) {
  const resultDiv = document.getElementById('changeUserIdResult');
  const btn = document.querySelector('#page-admin-users .btn-warning');

  if (btn) setButtonLoading(btn, true);
  if (resultDiv) {
    showConanLoading('changeUserIdResult', 'changeUserId');
  }

  const result = await callAdminApi('changeUserId', {
    oldUserId: oldUserId,
    newUserId: newUserId
  });

  if (btn) setButtonLoading(btn, false);

  if (result && result.success) {
    let details = '';
    if (result.results) {
      details = '<ul style="margin-top: 10px; text-align: left;">';
      if (result.results.users) details += '<li>✓ 使用者資料已更新</li>';
      if (result.results.transactions) details += '<li>✓ 交易紀錄已更新</li>';
      if (result.results.orderDetails) details += '<li>✓ 訂單歷史已更新</li>';
      details += '</ul>';
    }

    if (resultDiv) {
      resultDiv.innerHTML = `<div class="message success">✅ ${escapeHtml(result.message)}${details}</div>`;
    }

    document.getElementById('changeOldUserId').value = '';
    document.getElementById('changeNewUserId').value = '';

    showMessageModal('✅ 成功', '學號更改成功');
  } else {
    if (resultDiv) {
      resultDiv.innerHTML = `<div class="message error">❌ ${escapeHtml(result?.message || '更改失敗')}</div>`;
    }
  }
}

/**
 * 初始化管理員用戶頁面
 */
function initAdminUsersPage() {
  const resultDiv = document.getElementById('changeUserIdResult');
  if (resultDiv) resultDiv.innerHTML = '';
  const oldInput = document.getElementById('changeOldUserId');
  const newInput = document.getElementById('changeNewUserId');
  if (oldInput) oldInput.value = '';
  if (newInput) newInput.value = '';
}

window.confirmChangeUserId = confirmChangeUserId;
window.changeUserId = changeUserId;
window.initAdminUsersPage = initAdminUsersPage;

console.log('👥 管理員用戶模組已載入');
