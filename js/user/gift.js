// ==================== gift.js ====================
// 使用者禮包碼兌換模組
// 依賴：api.js、state.js、ui.js、common.js、core.js
// ====================================================

async function redeemGiftCode(event) {
  const btn = event ? event.currentTarget : null;
  const code = document.getElementById('giftCode').value.trim();
  const userId = document.getElementById('rechargeStudentId').value.trim();

  if (!code || !userId) {
    showMessageModal('❌ 輸入錯誤', '請輸入禮包碼和學號');
    return;
  }

  if (!/^\d{6}$/.test(code)) {
    showMessageModal('❌ 輸入錯誤', '禮包碼必須為6位數字');
    return;
  }

  if (!/^\d{6}$/.test(userId)) {
    showMessageModal('❌ 輸入錯誤', '學號必須為6位數字');
    return;
  }

  const resultDiv = document.getElementById('rechargeResult');

  if (btn) setButtonLoading(btn, true);
  if (resultDiv) resultDiv.innerHTML = '<div class="loading"><div class="spinner"></div>處理中...</div>';

  const result = await callApi('redeemGiftCode', {
    userId: userId,
    giftCode: code
  });

  if (btn) setButtonLoading(btn, false);

  if (result.success) {
    if (resultDiv) {
      resultDiv.innerHTML = `<div class="message success"><i class="fas fa-check-circle"></i> ${escapeHtml(result.message)}</div>`;
    }
    document.getElementById('giftCode').value = '';
    document.getElementById('rechargeStudentId').value = '';
  } else {
    if (resultDiv) {
      resultDiv.innerHTML = `<div class="message error"><i class="fas fa-exclamation-circle"></i> ${escapeHtml(result.message)}</div>`;
    }
  }
}

window.redeemGiftCode = redeemGiftCode;

console.log('💰 儲值模組已載入');
