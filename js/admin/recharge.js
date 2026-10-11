// ==================== recharge.js ====================
// 管理員直接儲值模組（Supabase 版）
// 依賴：supabase.js、state.js、ui.js、common.js、core.js
// ==================================================

function setDirectAmount(amount) {
  const amountInput = document.getElementById('directRechargeAmount');
  if (amountInput) amountInput.value = amount;
}

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

  try {
    const sb = await initSupabase();

    const { data, error } = await sb.rpc('admin_recharge', {
      p_user_id: userId,
      p_amount: amountNum,
      p_note: note || '管理員直接儲值'
    });

    if (btn) setButtonLoading(btn, false);

    if (error) {
      if (resultDiv) resultDiv.innerHTML = `<div class="message error">❌ ${escapeHtml(error.message)}</div>`;
      return;
    }

    if (data.success) {
      if (resultDiv) {
        resultDiv.innerHTML = `
          <div class="message success">
            <i class="fas fa-check-circle"></i> ✅ 儲值成功！<br>
            <strong>${escapeHtml(data.name)} (${escapeHtml(data.user_id)})</strong><br>
            儲值金額: $${data.amount}<br>
            新餘額: $${data.new_balance}
          </div>
        `;
      }
      document.getElementById('directRechargeUserId').value = '';
      document.getElementById('directRechargeAmount').value = '';
      document.getElementById('directRechargeNote').value = '';
    } else {
      if (resultDiv) resultDiv.innerHTML = `<div class="message error">❌ ${escapeHtml(data.message)}</div>`;
    }

  } catch (error) {
    if (btn) setButtonLoading(btn, false);
    console.error('儲值失敗:', error);
    if (resultDiv) resultDiv.innerHTML = `<div class="message error">❌ ${escapeHtml(error.message)}</div>`;
  }
}

window.setDirectAmount = setDirectAmount;
window.directRecharge = directRecharge;

console.log('⚡ 直接儲值模組已載入（Supabase 版）');
