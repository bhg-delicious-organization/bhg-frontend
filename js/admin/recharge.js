// ==================== recharge.js ====================
// 管理員直接儲值模組（Supabase 版 + 二次確認）
// 依賴：supabase.js、state.js、ui.js、common.js、core.js
// ==================================================

function setDirectAmount(amount) {
  const amountInput = document.getElementById('directRechargeAmount');
  if (amountInput) amountInput.value = amount;
}

/**
 * 確認儲值（先查姓名，再彈確認）
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

  // 查姓名
  if (btn) setButtonLoading(btn, true);

  const resultDiv = document.getElementById('directRechargeResult');
  if (resultDiv) showConanLoading('directRechargeResult', 'adminDirectRecharge');

  let userData = null;
  try {
    const sb = await initSupabase();
    const { data } = await sb
      .from('users')
      .select('name, balance')
      .eq('user_id', userId)
      .maybeSingle();

    userData = data;
  } catch (e) {
    console.warn('查姓名失敗:', e);
  }

  if (btn) setButtonLoading(btn, false);
  if (resultDiv) resultDiv.innerHTML = '';

  if (!userData) {
    if (resultDiv) {
      resultDiv.innerHTML = `<div class="message error">❌ 查無此學號（${escapeHtml(userId)}）</div>`;
    }
    return;
  }

  // 彈出確認
  const confirmMsg =
    `學號：${userId}\n` +
    `姓名：${userData.name}\n` +
    `目前餘額：$${userData.balance}\n` +
    `儲值金額：$${amountNum}\n` +
    `儲值後餘額：$${Number(userData.balance) + amountNum}\n` +
    `備註：${note || '（無）'}\n\n` +
    `確定要儲值嗎？`;

  showConfirmModal(
    '⚠️ 確認儲值',
    confirmMsg,
    function() {
      executeDirectRecharge(userId, amountNum, note, event);
    }
  );
}

/**
 * 執行儲值
 */
async function executeDirectRecharge(userId, amountNum, note, event) {
  const btn = event ? event.currentTarget : null;

  if (btn) setButtonLoading(btn, true);

  const resultDiv = document.getElementById('directRechargeResult');
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

console.log('⚡ 直接儲值模組已載入（二次確認版）');
