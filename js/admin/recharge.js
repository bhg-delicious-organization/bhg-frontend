// ==================== recharge.js ====================
// 管理員直接儲值模組
// 依賴：api.js、state.js、ui.js、common.js、core.js
// ====================================================

/**
 * 設定直接儲值的金額
 */
function setDirectAmount(amount) {
  const amountInput = document.getElementById('directRechargeAmount');
  if (amountInput) amountInput.value = amount;
}

/**
 * 管理員直接儲值
 */
async function directRecharge(event) {
  const btn = event ? event.currentTarget : null;

  const userId = document.getElementById('directRechargeUserId').value.trim();
  const amount = document.getElementById('directRechargeAmount').value;
  const note = document.getElementById('directRechargeNote').value.trim();

  if (!userId) {
    showMessageModal('❌ 輸入錯誤', '請輸入學號');
    return;
  }

  if (!/^\d{6}$/.test(userId)) {
    showMessageModal('❌ 輸入錯誤', '學號必須為6位數字');
    return;
  }

  if (!amount || amount <= 0) {
    showMessageModal('❌ 輸入錯誤', '請輸入有效金額');
    return;
  }

  const amountNum = parseFloat(amount);
  if (isNaN(amountNum) || amountNum <= 0) {
    showMessageModal('❌ 輸入錯誤', '請輸入有效的正數金額');
    return;
  }

  const resultDiv = document.getElementById('directRechargeResult');

  if (btn) setButtonLoading(btn, true);
  if (resultDiv) showConanLoading('directRechargeResult', 'adminDirectRecharge');

  const result = await callAdminApi('adminDirectRecharge', {
    userId: userId,
    amount: amountNum,
    note: note || '管理員直接儲值'
  });

  if (btn) setButtonLoading(btn, false);

  if (result.success) {
    if (resultDiv) {
      resultDiv.innerHTML = `
        <div class="message success">
          <i class="fas fa-check-circle"></i> ✅ 儲值成功！<br>
          <strong>${escapeHtml(result.name)} (${escapeHtml(result.user_id)})</strong><br>
          儲值金額: $${result.amount}<br>
          新餘額: $${result.new_balance}
        </div>
      `;
    }
    document.getElementById('directRechargeUserId').value = '';
    document.getElementById
