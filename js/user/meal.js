// ==================== meal.js ====================
// 使用者訂飯模組（Supabase 版 + 自動載入 + 星星評分 + 禁用說明）
// 依賴：supabase.js、state.js、ui.js、time.js、common.js、core.js、navigation.js
// ==================================================

async function loadMealInfo(event) {
  let btn = null;
  if (event && event.currentTarget) {
    btn = event.currentTarget;
  } else {
    btn = document.querySelector('#page-user-meal .btn-primary');
  }

  const studentId = AppState.currentStudentId();
  if (!studentId) {
    showMessageModal('❌ 錯誤', '請重新登入');
    navigateTo('user-register');
    return;
  }

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
      .maybeSingle();

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
      .maybeSingle();

    const hasRestaurant = !!(restaurantData && restaurantData.value);

    await updateMealBalanceDisplay(userData.balance);

    // ========== 點餐按鈕狀態 ==========
    const isOrderTime = isUserOrderTime();
    const canOrder = hasRestaurant && isOrderTime;

    const mealSelectionDiv = document.getElementById('mealSelection');
    if (mealSelectionDiv) {
      mealSelectionDiv.style.display = 'flex';

      const orderBtn = mealSelectionDiv.querySelector('.btn-success');
      const hintEl = document.getElementById('mealSelectionHint');

      if (canOrder) {
        if (orderBtn) {
          orderBtn.disabled = false;
          orderBtn.style.opacity = '';
          orderBtn.style.cursor = '';
          orderBtn.innerHTML = '<i class="fas fa-utensils"></i> 點餐';
        }
        if (hintEl) hintEl.style.display = 'none';
      } else {
        if (orderBtn) {
          orderBtn.disabled = true;
          orderBtn.style.opacity = '0.5';
          orderBtn.style.cursor = 'not-allowed';
          orderBtn.innerHTML = '<i class="fas fa-lock"></i> 點餐';
        }

        if (hintEl) {
          let hintText = '';
          const timeRange = getOrderTimeRange();

          if (!hasRestaurant && !isOrderTime) {
            hintText = `⏰ 點餐時間為 ${timeRange}<br>🍽️ 今日餐廳尚未設定`;
          } else if (!hasRestaurant) {
            hintText = `🍽️ 今日餐廳尚未設定，請稍後再試`;
          } else if (!isOrderTime) {
            if (isOrderEnded()) {
              hintText = `⏰ 今日訂餐已截止（點餐時間 ${timeRange}）`;
            } else {
              hintText = `⏰ 點餐時間為 ${timeRange}，尚未開始`;
            }
          }

          hintEl.innerHTML = hintText;
          hintEl.style.display = 'block';
        }
      }
    }
    // ========== 點餐按鈕狀態結束 ==========

    if (isOrderTime || isOrderEnded()) {
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

async function refreshMealInfo() {
  const studentId = AppState.currentStudentId();
  if (!studentId) return;

  const inputElement = document.getElementById('mealStudentId');
  if (inputElement) inputElement.value = studentId;

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
      const currentRating = meal.rated || 0;

      html += `<li style="padding: 12px; background: #f8f9fa; margin-bottom: 12px; border-radius: 8px;" data-slot="${meal.slot}">`;
      html += `<div><strong>${escapeHtml(meal.meal_name)}</strong> x${meal.amount}</div>`;
      html += `<div style="font-size: 0.8rem; color: var(--gray);">${escapeHtml(meal.restaurant)} - ${escapeHtml(meal.category)}</div>`;

      if (ratingTime) {
        html += renderStarRating(meal.slot, currentRating);
      } else if (currentRating > 0) {
        html += `<div style="margin-top: 8px; font-size: 0.8rem; color: var(--success);">
          <i class="fas fa-check-circle"></i> 已評分：${currentRating} 分
        </div>`;
      }

      html += `</li>`;
    });

    html += '</ul>';
    container.innerHTML = html;

    if (ratingTime) {
      container.querySelectorAll('.star-rating').forEach(starContainer => {
        const slot = parseInt(starContainer.dataset.slot);
        bindStarRating(starContainer, studentId, slot);
      });
    }

    const cached = AppState.getUserData(studentId) || {};
    AppState.setUserData(studentId, { ...cached, meals: meals || [] });

  } catch (error) {
    console.error('載入今日餐點失敗:', error);
    const container = document.getElementById('todayMealDisplay');
    if (container) {
      container.innerHTML = '<div class="message error">❌ 載入失敗</div>';
    }
  }
}

function renderStarRating(slot, currentRating) {
  let html = `<div class="star-rating" data-slot="${slot}">`;
  for (let i = 1; i <= 5; i++) {
    const activeClass = i <= currentRating ? 'active' : '';
    html += `<i class="fas fa-star ${activeClass}" data-value="${i}"></i>`;
  }
  html += '</div>';
  return html;
}

function bindStarRating(container, studentId, slotIndex) {
  const stars = container.querySelectorAll('i');
  stars.forEach(star => {
    star.addEventListener('click', function(e) {
      e.stopPropagation();
      const rating = parseInt(this.dataset.value);
      submitRating(studentId, slotIndex, rating, container);
    });
  });
}

async function submitRating(studentId, slotIndex, rating, starContainer) {
  const stars = starContainer.querySelectorAll('i');
  stars.forEach(star => {
    const val = parseInt(star.dataset.value);
    if (val <= rating) {
      star.classList.add('active');
    } else {
      star.classList.remove('active');
    }
  });

  try {
    const sb = await initSupabase();

    const { error } = await sb
      .from('today_meals')
      .update({ rated: rating })
      .eq('user_id', studentId)
      .eq('slot', slotIndex);

    if (error) {
      showMessageModal('❌ 評分失敗', error.message);
      return;
    }

    showMessageModal('✅ 評分成功', `已評分 ${rating} 顆星`);

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
      .maybeSingle();

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

console.log('🍽️ 訂飯模組已載入（星星評分 + 禁用說明版）');
