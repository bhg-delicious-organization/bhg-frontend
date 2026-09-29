// ==================== orders.js ====================
// 管理員訂單管理模組
// 依賴：api.js、state.js、ui.js、common.js、core.js
// ====================================================

/**
 * 載入今日訂單
 */
async function loadTodayOrders(event) {
  const btn = event ? event.currentTarget : null;
  if (btn) setButtonLoading(btn, true);

  const display = document.getElementById('ordersDisplay');
  const badge = document.getElementById('orderCountBadge');

  if (display) display.innerHTML = '<div class="loading"><div class="spinner"></div>載入中...</div>';

  const result = await callAdminApi('getOrderDetails', {});

  if (btn) setButtonLoading(btn, false);

  if (!result.success) {
    if (display) display.innerHTML = `<div class="message error">❌ ${escapeHtml(result.message)}</div>`;
    if (badge) badge.textContent = '載入失敗';
    return;
  }

  if (!result.orders || result.orders.length === 0) {
    if (display) display.innerHTML = '<div class="message info">暫無訂單紀錄</div>';
    if (badge) badge.textContent = '0 筆訂單';
    return;
  }

  if (badge) badge.textContent = `${result.orders.length} 筆訂單`;

  // 計算總金額
  let grandTotal = 0;
  result.orders.forEach(o => { grandTotal += o.totalAmount; });

  let html = '';

  result.orders.forEach(order => {
    const orderDate = new Date(order.timestamp);
    const dateStr = orderDate.toLocaleString('zh-TW', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });

    html += `
      <div style="margin-bottom: 15px; padding: 12px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid var(--primary);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; flex-wrap: wrap; gap: 5px;">
          <div>
            <span class="badge badge-info" style="margin-right: 8px;">${escapeHtml(order.displayRestaurant || '未知餐廳')}</span>
            <span style="font-size: 0.8rem; color: var(--gray); font-family: monospace;">${escapeHtml(order.orderId)}</span>
          </div>
          <span style="font-size: 0.8rem; color: var(--gray);">${dateStr}</span>
        </div>

        <div style="margin-bottom: 8px; font-size: 0.9rem;">
          👥 <strong>${order.userCount}</strong> 位使用者 · 💰 總額 <strong>$${order.totalAmount.toFixed(1)}</strong>
        </div>

        <details class="custom-arrow" style="background: white; border-radius: 8px; padding: 8px;">
          <summary style="cursor: pointer; font-weight: 500;">展開訂單明細</summary>
          <div style="margin-top: 10px;">

            <div style="margin-bottom: 10px;">
              <strong style="font-size: 0.85rem;">👥 使用者小計</strong>
              <table style="width: 100%; font-size: 0.85rem; margin-top: 5px; border-collapse: collapse;">
                <tbody>
    `;

    order.userTotals.forEach(ut => {
      html += `
        <tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 4px;">${escapeHtml(ut.userId)} ${escapeHtml(ut.userName)}</td>
          <td style="padding: 4px; text-align: right;">$${ut.total.toFixed(1)}</td>
        </tr>
      `;
    });

    html += `
                </tbody>
              </table>
            </div>

            <div>
              <strong style="font-size: 0.85rem;">🍱 餐點明細</strong>
              <table style="width: 100%; font-size: 0.85rem; margin-top: 5px; border-collapse: collapse;">
                <thead>
                  <tr style="border-bottom: 1px solid #dee2e6;">
                    <th style="padding: 4px; text-align: left;">餐點</th>
                    <th style="padding: 4px; text-align: center;">數量</th>
                    <th style="padding: 4px; text-align: right;">小計</th>
                  </tr>
                </thead>
                <tbody>
    `;

    order.items.forEach(item => {
      html += `
        <tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 4px;">${escapeHtml(item.mealName)}</td>
          <td style="padding: 4px; text-align: center;">x${item.quantity}</td>
          <td style="padding: 4px; text-align: right;">$${item.subtotal.toFixed(1)}</td>
        </tr>
      `;
    });

    html += `
                </tbody>
              </table>
            </div>

          </div>
        </details>
      </div>
    `;
  });

  // 總計
  html += `
    <div style="margin-top: 20px; padding: 15px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 8px;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span><i class="fas fa-calculator"></i> <strong>全部訂單總計</strong></span>
        <span style="font-size: 1.3rem; font-weight: bold;">$${grandTotal.toFixed(1)}</span>
      </div>
    </div>
  `;

  if (display) display.innerHTML = html;
}

window.loadTodayOrders = loadTodayOrders;

console.log('📋 訂單模組已載入');
