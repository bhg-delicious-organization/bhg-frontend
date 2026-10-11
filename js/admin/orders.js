// ==================== orders.js ====================
// 管理員訂單管理模組（Supabase 版）
// 依賴：supabase.js、state.js、ui.js、common.js、core.js
// ==================================================

async function loadTodayOrders(event) {
  const btn = event ? event.currentTarget : null;
  if (btn) setButtonLoading(btn, true);

  const display = document.getElementById('ordersDisplay');
  const badge = document.getElementById('orderCountBadge');

  if (display) showConanLoading('ordersDisplay', 'getOrderDetails');

  try {
    const sb = await initSupabase();

    // 1. 讀 orders
    const { data: orders, error: oErr } = await sb
      .from('orders')
      .select('id, order_id, restaurant, total, status, created_at')
      .order('created_at', { ascending: false })
      .limit(20);

    if (btn) setButtonLoading(btn, false);

    if (oErr) throw new Error(oErr.message);

    if (!orders || orders.length === 0) {
      if (display) display.innerHTML = '<div class="message info">暫無訂單紀錄</div>';
      if (badge) badge.textContent = '0 筆訂單';
      return;
    }

    // 2. 讀 order_users
    const orderIds = orders.map(o => o.id);

    const { data: orderUsers, error: ouErr } = await sb
      .from('order_users')
      .select('id, order_id, user_id, user_name, user_total')
      .in('order_id', orderIds);

    if (ouErr) throw new Error(ouErr.message);

    // 3. 讀 order_items
    const ouIds = (orderUsers || []).map(ou => ou.id);

    let orderItems = [];
    if (ouIds.length > 0) {
      const { data: items, error: oiErr } = await sb
        .from('order_items')
        .select('id, order_user_id, meal_name, quantity, price, subtotal')
        .in('order_user_id', ouIds);

      if (oiErr) throw new Error(oiErr.message);
      orderItems = items || [];
    }

    // 4. 組裝
    const itemsByOu = {};
    orderItems.forEach(item => {
      if (!itemsByOu[item.order_user_id]) itemsByOu[item.order_user_id] = [];
      itemsByOu[item.order_user_id].push(item);
    });

    const usersByOrder = {};
    (orderUsers || []).forEach(ou => {
      if (!usersByOrder[ou.order_id]) usersByOrder[ou.order_id] = [];
      usersByOrder[ou.order_id].push({
        userId: ou.user_id,
        userName: ou.user_name,
        total: Number(ou.user_total),
        items: itemsByOu[ou.id] || []
      });
    });

    // 5. 計算總額
    let grandTotal = 0;
    orders.forEach(o => { grandTotal += Number(o.total); });

    if (badge) badge.textContent = `${orders.length} 筆訂單`;

    // 6. 渲染
    let html = '';

    orders.forEach(order => {
      const orderDate = new Date(order.created_at);
      const dateStr = orderDate.toLocaleString('zh-TW', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit'
      });

      const users = usersByOrder[order.id] || [];
      const userCount = users.length;

      html += `
        <div style="margin-bottom: 15px; padding: 12px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid var(--primary);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; flex-wrap: wrap; gap: 5px;">
            <div>
              <span class="badge badge-info" style="margin-right: 8px;">${escapeHtml(order.restaurant || '未知餐廳')}</span>
              <span style="font-size: 0.8rem; color: var(--gray); font-family: monospace;">${escapeHtml(order.order_id)}</span>
            </div>
            <span style="font-size: 0.8rem; color: var(--gray);">${dateStr}</span>
          </div>

          <div style="margin-bottom: 8px; font-size: 0.9rem;">
            👥 <strong>${userCount}</strong> 位使用者 · 💰 總額 <strong>$${Number(order.total).toFixed(1)}</strong>
          </div>

          <details class="custom-arrow" style="background: white; border-radius: 8px; padding: 8px;">
            <summary style="cursor: pointer; font-weight: 500;">展開訂單明細</summary>
            <div style="margin-top: 10px;">

              <div style="margin-bottom: 10px;">
                <strong style="font-size: 0.85rem;">👥 使用者小計</strong>
                <table style="width: 100%; font-size: 0.85rem; margin-top: 5px; border-collapse: collapse;">
                  <tbody>
      `;

      users.forEach(u => {
        html += `
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 4px;">${escapeHtml(u.userId)} ${escapeHtml(u.userName)}</td>
            <td style="padding: 4px; text-align: right;">$${u.total.toFixed(1)}</td>
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

      users.forEach(u => {
        u.items.forEach(item => {
          html += `
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 4px;">${escapeHtml(item.meal_name)}</td>
              <td style="padding: 4px; text-align: center;">x${item.quantity}</td>
              <td style="padding: 4px; text-align: right;">$${Number(item.subtotal).toFixed(1)}</td>
            </tr>
          `;
        });
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

    html += `
      <div style="margin-top: 20px; padding: 15px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 8px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span><i class="fas fa-calculator"></i> <strong>全部訂單總計</strong></span>
          <span style="font-size: 1.3rem; font-weight: bold;">$${grandTotal.toFixed(1)}</span>
        </div>
      </div>
    `;

    if (display) display.innerHTML = html;

  } catch (error) {
    if (btn) setButtonLoading(btn, false);
    console.error('載入訂單失敗:', error);
    if (display) display.innerHTML = `<div class="message error">❌ ${escapeHtml(error.message)}</div>`;
    if (badge) badge.textContent = '載入失敗';
  }
}

window.loadTodayOrders = loadTodayOrders;

console.log('📋 訂單模組已載入（Supabase 版）');
