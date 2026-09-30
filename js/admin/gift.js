// ==================== gift.js ====================
// 管理員禮包碼管理模組
// 依賴：api.js、state.js、ui.js、common.js、core.js
// ====================================================

/**
 * 設定產生禮包碼的金額
 */
function setAdminGiftAmount(amount) {
  const amountInput = document.getElementById('giftAmount');
  if (amountInput) amountInput.value = amount;
}

/**
 * 產生禮包碼
 */
async function generateGiftCode(event) {
  const btn = event ? event.currentTarget : null;
  const amount = document.getElementById('giftAmount').value;

  if (!amount || amount <= 0) {
    showMessageModal('❌ 輸入錯誤', '請輸入有效金額');
    return;
  }

  const resultDiv = document.getElementById('giftCodeResult');

  if (btn) setButtonLoading(btn, true);
  if (resultDiv) showConanLoading('giftCodeResult', 'generateGiftCode');

  const result = await callAdminApi('generateGiftCode', {
    amount: parseFloat(amount)
  });

  if (btn) setButtonLoading(btn, false);

  if (result.success) {
    if (resultDiv) {
      resultDiv.innerHTML = `
        <div class="message success">
          <i class="fas fa-check-circle"></i> 禮包碼產生成功！<br>
          <strong style="font-size: 1.5rem; font-family: monospace;">${escapeHtml(result.giftCode)}</strong><br>
          金額：$${result.amount}
        </div>
      `;
    }
    loadRecentGiftCodes();
  } else {
    if (resultDiv) resultDiv.innerHTML = `<div class="message error">❌ ${escapeHtml(result.message)}</div>`;
  }
}

/**
 * 載入最近產生的禮包碼列表
 */
async function loadRecentGiftCodes() {
  if (!AppState.isAdmin()) {
    const list = document.getElementById('recentGiftCodesList');
    if (list) list.innerHTML = '<div class="message info">請先登入管理員</div>';
    return;
  }

  const list = document.getElementById('recentGiftCodesList');
  if (!list) return;

  showConanLoading('recentGiftCodesList', 'getRecentGiftCodes');

  const result = await callAdminApi('getRecentGiftCodes', { limit: 10 });

  if (result.success && result.codes && result.codes.length > 0) {
    let html = '<div style="display: flex; flex-direction: column; gap: 8px;">';

    result.codes.forEach(code => {
      const timeStr = code.time ? code.time.split(' ')[1] : '--:--';
      html += `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid var(--secondary);">
          <div>
            <span style="font-family: monospace; font-size: 1.2rem; font-weight: bold;">${escapeHtml(code.code)}</span>
            <span style="color: var(--success); margin-left: 10px;">$${code.amount}</span>
          </div>
          <div>
            <span style="color: var(--gray); font-size: 0.85rem;">
              <i class="far fa-clock"></i> ${escapeHtml(timeStr)}
            </span>
          </div>
        </div>
      `;
    });

    html += '</div>';
    list.innerHTML = html;
  } else {
    list.innerHTML = '<div class="message info">尚無禮包碼紀錄</div>';
  }
}

window.setAdminGiftAmount = setAdminGiftAmount;
window.generateGiftCode = generateGiftCode;
window.loadRecentGiftCodes = loadRecentGiftCodes;

console.log('🎁 禮包碼模組已載入');
