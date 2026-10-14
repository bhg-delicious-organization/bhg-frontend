// ==================== meal.js ====================
// 使用者訂飯模組（Supabase 版 + 自動載入）
// 依賴：supabase.js、state.js、ui.js、time.js、common.js、core.js、navigation.js
// ==================================================

/**
 * 載入訂飯頁資訊（從 session 拿學號，不從輸入框）
 */
async function loadMealInfo(event) {
  let btn = null;
  if (event && event.currentTarget) {
    btn = event.currentTarget;
  } else {
    btn = document.querySelector('#page-user-meal .btn-primary');
  }

  // 從 session 拿學號
  const studentId = AppState.currentStudentId();
  if (!studentId) {
    showMessageModal('❌ 錯誤', '請重新登入');
    navigateTo('user-register');
    return;
  }

  // 自動填入輸入框（唯讀）
  const inputElement = document.getElementById('mealStudentId');
  if (inputElement) inputElement.value = studentId;

  if (btn) setButtonLoading(btn, true);

  await ensureTimeLimitsLoaded();

  try {
    const sb = await initSupabase();

    const { data: userData, error: userError } = await sb
      .from('users')
      .select('balance, name')
      .eq('user_id', studentId)
      .single();

    if (btn) setButtonLoading(btn, false);

    if (userError || !userData) {
      const box = document.getElementById('mealBalanceBox');
      if (box) box.textContent = '查無此學號';
      return;
    }

    const { data: restaurantData } = await sb
      .from('system_settings')
      .select('value')
      .eq('key', 'today_restaurant')
      .single();

    const hasRestaurant = restaurantData && restaurantData.value;

    await updateMealBalanceDisplay(userData.balance);

    const showMealSelection = hasRestaurant && isUserOrderTime();
    const mealSelectionDiv = document.getElementById('mealSelection');
    if (mealSelectionDiv) {
      mealSelectionDiv.style.display = showMealSelection ? 'flex' : 'none';
    }

    if (isUserOrderTime() || isOrderEnded()) {
      await loadUserTodayMeals(studentId);
    } else {
      const display = document.getElementById('todayMealDisplay');
      if (display) {
        const timeRange = getOrderTimeRange();
        display.innerHTML = `
          <h3>📋 今日餐點</h3>
          <p style="color: var(--gray);">🕐 點餐時間為 ${timeRange}</p>
        `;
      }
    }

    await checkUserOrderHistory();

  } catch (error) {
    if (btn) setButtonLoading(btn, false);
    console.error('載入失敗:', error);
    showMessageModal('❌ 錯誤', error.message || '載入失敗');
  }
}

/**
 * 背景重新整理訂飯頁資訊（navigation 呼叫）
 */
async function refreshMealInfo() {
  const studentId = AppState.currentStudentId();
  if (!studentId) return;

  // 自動填入輸入框
  const inputElement = document.getElementById('mealStudentId');
  if (inputElement) inputElement.value = studentId;

  // 若頁面還沒載入，跳過
  if (!document.getElementById('mealStudentId')) return;

  await loadMealInfo();
}

async function updateMealBalanceDisplay(balance) {
  try {
    const sb = await initSupabase();
    const studentId = AppState.currentStudentId();

    const { data: meals, error } = await sb
      .from('today_meals')
      .select('amount, price')
      .eq('user_id', studentId);

    let currentTotal = 0;
    if (!error && meals) {
      meals.forEach(meal => {
        currentTotal += (meal.amount || 0) * (meal.price || 0);
      });
    }

    const remaining = balance - currentTotal;
    const box = document.getElementById('mealBalanceBox');

    if (box) {
      box.innerHTML = `
        <div>💰 目前餘額：<strong>$${balance}</strong></div>
        <div style="font-size: 0.9rem; margin-top: 8px;">
          🍱 今日已點：<strong>$${currentTotal}</strong><br>
          ✨ 剩餘可用：<strong style="color: ${remaining >= 0 ? '#27ae60' : '#e74c3c'}">$${remaining}</strong>
        </div>
      `;
    }
  } catch (error) {
    console.warn('更新餘額顯示失敗:', error);
  }
}

async function loadUserTodayMeals(studentId) {
  const currentTime = getCurrentTimeNumber();
  const orderStart = TIME.ORDER_START;
  const orderEnd = TIME.ORDER_END;
  const ratingTime = isRatingTime();

  // 優先使用快取
  const cached = AppState.getUserData();
  if (cached?.meals && document.getElementById('todayMealDisplay')) {
    // 有快取，先渲染
  }

  try {
    const sb = await initSupabase();

    const { data: meals, error } = await sb
      .from('today_meals')
      .select('slot, restaurant, category, meal_name, amount, price, rated')
      .eq('user_id', studentId)
      .order('slot');

    const container = document.getElementById('todayMealDisplay');
    if (!container) return;

    let html = '<h3>📋 今日餐點</h3>';

    const timeRange = getOrderTimeRange();

    if (currentTime < orderStart) {
      html += `<p style="color: var(--gray);">🕐 點餐時間為 ${timeRange}，尚未開始</p>`;
      container.innerHTML = html;
      return;
    }

    if (error || !meals || meals.length === 0) {
      if (currentTime >= orderEnd) {
        html += `<p style="color: var(--gray);">⏰ 今日訂餐已截止<br>今日無訂餐</p>`;
      } else {
        html += '<p>今日尚未點餐</p>';
      }
      container.innerHTML = html;
      return;
    }

    if (currentTime >= orderEnd) {
      html += `<p style="color: var(--danger); margin-bottom: 8px;">⏰ 今日訂餐已截止</p>`;
    }

    if (ratingTime) {
      html += `<p style="color: var(--success); margin-bottom: 8px; font-size: 0.85rem;">
        <i class="fas fa-star"></i> 評分時間 12:00-16:00，為喜歡的餐點評分吧！
      </p>`;
    } else if (currentTime < TIME.RATING_START) {
      const remaining = getRatingTimeRemaining();
      html += `<p style="color: var(--gray); margin-bottom: 8px; font-size: 0.85rem;">
        <i class="fas fa-clock"></i> 評分將於 ${formatTimeRemaining(remaining)} 後開始
      </p>`;
    } else if (currentTime >= TIME.RATING_END) {
      html += `<p style="color: var(--gray); margin-bottom: 8px; font-size: 0.85rem;">
        <i class="fas fa-clock"></i> 今日評分已結束，下次再來評分吧！
      </p>`;
    }

    html += '<ul style="list-style: none; padding: 0;">';

    meals.forEach(meal => {
      const isNotRated = (!meal.rated || meal.rated === 0);
      const hasRated = meal.rated && meal.rated !== 0;

      html += `<li style="padding: 12px; background: #f8f9fa; margin-bottom: 12px; border-radius: 8px;" data-slot="${meal.slot}">`;
      html += `<div><strong>${escapeHtml(meal.meal_name)}</strong> x${meal.amount}</div>`;
      html += `<div style="font-size: 0.8rem; color: var(--gray);">${escapeHtml(meal.restaurant)} - ${escapeHtml(meal.category)}</div>`;

      const showRatingButtons = ratingTime && isNotRated;

      if (showRatingButtons) {
        html += `
          <div class="rating-buttons" data-slot="${meal.slot}" style="display: flex; gap: 6px; margin-top: 10px; flex-wrap: wrap;">
            <button class="btn rating-btn" data-rating="5" style="flex: 1; padding: 6px 8px; background: #f39c12; color: white; font-size: 0.7rem; width: auto;">⭐ 夯爆了</button>
            <button class="btn rating-btn" data-rating="4" style="flex: 1; padding: 6px 8px; background: #2ecc71; color: white; font-size: 0.7rem; width: auto;">🔥 頂級</button>
            <button class="btn rating-btn" data-rating="3" style="flex: 1; padding: 6px 8px; background: #3498db; color: white; font-size: 0.7rem; width: auto;">👑 人上人</button>
            <button class="btn rating-btn" data-rating="2" style="flex: 1; padding: 6px 8px; background: #95a5a6; color: white; font-size: 0.7rem; width: auto;">🎭 NPC</button>
            <button class="btn rating-btn" data-rating="1" style="flex: 1; padding: 6px 8px; background: #e74c3c; color: white; font-size: 0.7rem; width: auto;">💩 拉完了</button>
          </div>
        `;
      } else if (hasRated) {
        const ratingText = {1: '拉完了', 2: 'NPC', 3: '人上人', 4: '頂級', 5: '夯爆了'};
        const stars = '⭐'.repeat(meal.rated);
        html += `<div style="margin-top: 8px; font-size: 0.8rem; color: var(--success);">
          <i class="fas fa-check-circle"></i> 已評分：${ratingText[meal.rated]} ${stars} (${meal.rated}分)
        </div>`;
      }

      html += `</li>`;
    });

    html += '</ul>';
    container.innerHTML = html;

    container.querySelectorAll('.rating-btn').forEach(btn => {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        const rating = parseInt(this.dataset.rating);
        const li = this.closest('li');
        const slotIndex = parseInt(li.dataset.slot);
        submitRating(studentId, slotIndex, rating, li);
      });
    });

    // 更新快取
    const cached = AppState.getUserData() || {};
    AppState.setUserData({ ...cached, meals: meals || [] });

  } catch (error) {
    console.error('載入今日餐點失敗:', error);
    const container = document.getElementById('todayMealDisplay');
    if (container) {
      container.innerHTML = '<div class="message error">❌ 載入失敗</div>';
    }
  }
}

async function submitRating(studentId, slotIndex, rating, liElement) {
  const ratingDiv = liElement.querySelector('.rating-buttons');

  if (ratingDiv) {
    ratingDiv._originalHTML = ratingDiv.innerHTML;
    ratingDiv.innerHTML = '<div style="text-align: center; padding: 8px;"><i class="fas fa-spinner fa-spin"></i> 送出評分中...</div>';
  }

  try {
    const sb = await initSupabase();

    const { error } = await sb
      .from('today_meals')
      .update({ rated: rating })
      .eq('user_id', studentId)
      .eq('slot', slotIndex);

    if (error) {
      if (ratingDiv && ratingDiv._originalHTML) {
        ratingDiv.innerHTML = ratingDiv._originalHTML;
        ratingDiv.querySelectorAll('.rating-btn').forEach(btn => {
          btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const newRating = parseInt(this.dataset.rating);
            const li = this.closest('li');
            const slot = parseInt(li.dataset.slot);
            submitRating(studentId, slot, newRating, li);
          });
        });
      }
      showMessageModal('❌ 評分失敗', error.message);
      return;
    }

    const ratingText = {1: '拉完了', 2: 'NPC', 3: '人上人', 4: '頂級', 5: '夯爆了'};
    const stars = '⭐'.repeat(rating);
    const successHtml = `<div style="margin-top: 8px; font-size: 0.8rem; color: var(--success);">
      <i class="fas fa-check-circle"></i> 已評分：${ratingText[rating]} ${stars} (${rating}分)
    </div>`;

    if (ratingDiv) ratingDiv.remove();
    liElement.insertAdjacentHTML('beforeend', successHtml);

    showMessageModal('✅ 評分成功', `評分：${ratingText[rating]}`);

  } catch (error) {
    console.error('評分失敗:', error);
    showMessageModal('❌ 評分失敗', error.message);
  }
}

async function enterMealOrderMode(event) {
  let btn = null;
  if (event && event.currentTarget) {
    btn = event.currentTarget;
  } else {
    btn = document.querySelector('#mealSelection .btn-success');
  }

  await ensureTimeLimitsLoaded();

  if (!isUserOrderTime()) {
    const timeRange = getOrderTimeRange();
    showMessageModal('❌ 非點餐時間', `點餐時間為 ${timeRange}`);
    return;
  }

  if (!AppState.currentStudentId()) {
    showMessageModal('❌ 錯誤', '請先登入');
    navigateTo('user-register');
    return;
  }

  if (btn) setButtonLoading(btn, true);

  try {
    const sb = await initSupabase();

    const { data: restaurantData } = await sb
      .from('system_settings')
      .select('value')
      .eq('key', 'today_restaurant')
      .single();

    if (btn) setButtonLoading(btn, false);

    if (restaurantData && restaurantData.value) {
      navigateTo('user-meal-order');
      if (typeof loadMealOrderPage === 'function') loadMealOrderPage();
    } else {
      showMessageModal('❌ 無法點餐', '今日餐廳尚未設定');
    }
  } catch (error) {
    if (btn) setButtonLoading(btn, false);
    console.error('載入失敗:', error);
    showMessageModal('❌ 錯誤', error.message);
  }
}

async function checkUserOrderHistory() {
  const studentId = AppState.currentStudentId();
  if (!studentId) return;

  try {
    const sb = await initSupabase();

    const { data: rows, error } = await sb
      .from('order_users')
      .select(`
        id,
        user_id,
        user_name,
        user_total,
        created_at,
        orders!inner(order_id, restaurant, created_at),
        order_items(meal_name, quantity, price, subtotal)
      `)
      .eq('user_id', studentId)
      .order('created_at', { ascending: false })
      .limit(50);

    const historySection = document.getElementById('userOrderHistorySection');
    const historyContainer = document.getElementById('userOrderHistory');
    const badge = document.getElementById('orderHistoryBadge');

    if (!historySection || !historyContainer) return;

    if (error || !rows || rows.length === 0) {
      historySection.style.display = 'none';
      return;
    }

    const userOrders = rows.map(row => ({
      orderId: row.orders.order_id,
      timestamp: row.orders.created_at,
      displayRestaurant: row.orders.restaurant,
      orderTotal: Number(row.user_total),
      items: (row.order_items || []).map(i => ({
        mealName: i.meal_name,
        quantity: Number(i.quantity),
        price: Number(i.price),
        subtotal: Number(i.subtotal)
      }))
    }));

    if (userOrders.length > 0) {
      historySection.style.display = 'block';
      const recentOrders = userOrders.slice(0, 10);
      displayUserOrderHistory(recentOrders, historyContainer);

      const displayedTotal = recentOrders.reduce((sum, order) => sum + order.orderTotal, 0);
      let badgeText = `顯示最新 ${recentOrders.length} 筆`;
      badgeText += ` | 小計 $${displayedTotal.toFixed(1)}`;
      if (badge) badge.textContent = badgeText;
    } else {
      historySection.style.display = 'none';
    }

  } catch (error) {
    console.warn('查訂單歷史失敗:', error);
  }
}

function displayUserOrderHistory(orders, container) {
  let html = '';
  let grandTotal = 0;

  orders.forEach(order => {
    const orderDate = new Date(order.timestamp);
    const dateStr = orderDate.toLocaleString('zh-TW', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });

    const restaurantDisplay = order.displayRestaurant || '未知餐廳';

    html += `
      <div style="margin-bottom: 15px; padding: 10px; background: #f8f9fa; border-radius: 8px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; flex-wrap: wrap; gap: 5px;">
          <div>
            <span class="badge badge-info" style="margin-right: 8px;">${escapeHtml(restaurantDisplay)}</span>
            <span style="font-size: 0.8rem; color: var(--gray);">${escapeHtml(order.orderId)}</span>
          </div>
          <span class="badge badge-info">${dateStr}</span>
        </div>
        <table style="width: 100%; font-size: 0.9rem; border-collapse: collapse;">
          <thead>
            <tr style="border-bottom: 1px solid #dee2e6;">
              <th style="padding: 5px; text-align: left;">餐點</th>
              <th style="padding: 5px; text-align: center;">數量</th>
              <th style="padding: 5px; text-align: right;">單價</th>
              <th style="padding: 5px; text-align: right;">小計</th>
            </tr>
          </thead>
          <tbody>
    `;

    order.items.forEach(item => {
      html += `
        <tr>
          <td style="padding: 5px;">${escapeHtml(item.mealName)}</td>
          <td style="padding: 5px; text-align: center;">x${item.quantity}</td>
          <td style="padding: 5px; text-align: right;">$${item.price.toFixed(1)}</td>
          <td style="padding: 5px; text-align: right;">$${item.subtotal.toFixed(1)}</td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
        <div style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed #dee2e6; text-align: right;">
          <strong>此訂單小計: $${order.orderTotal.toFixed(1)}</strong>
        </div>
      </div>
    `;

    grandTotal += order.orderTotal;
  });

  html += `
    <div style="margin-top: 15px; padding: 15px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 8px;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span><i class="fas fa-calculator"></i> <strong>顯示訂單總計</strong></span>
        <span style="font-size: 1.3rem; font-weight: bold;">$${grandTotal.toFixed(1)}</span>
      </div>
    </div>
  `;

  container.innerHTML = html;
}

window.loadMealInfo = loadMealInfo;
window.refreshMealInfo = refreshMealInfo;
window.enterMealOrderMode = enterMealOrderMode;

console.log('🍽️ 訂飯模組已載入（Supabase 版 + 自動載入）');
