// ==================== meal.js ====================
// 使用者訂飯模組（訂飯頁面）
// 依賴：api.js、state.js、ui.js、time.js、common.js、core.js、navigation.js
// ====================================================

/**
 * 載入訂飯頁面資訊
 */
async function loadMealInfo(event) {
  let btn = null;
  if (event && event.currentTarget) {
    btn = event.currentTarget;
  } else {
    btn = document.querySelector('#page-user-meal .btn-primary');
  }

  const studentId = document.getElementById('mealStudentId').value.trim();
  if (!studentId) {
    showMessageModal('❌ 輸入錯誤', '請輸入學號');
    return;
  }

  AppState.setCurrentStudentId(studentId);

  if (btn) setButtonLoading(btn, true);

  // 顯示柯南載入動畫
  showConanLoading('mealBalanceBox', 'getUserBalance');

  // 1. 查詢餐廳
  const restaurantResult = await callApi('getTodayRestaurant', {});
  const hasRestaurant = restaurantResult.success && restaurantResult.restaurant;

  // 2. 查詢餘額
  const balanceResult = await callApi('getUserBalance', { userId: studentId });

  if (btn) setButtonLoading(btn, false);

  if (!balanceResult.success) {
    const box = document.getElementById('mealBalanceBox');
    if (box) box.textContent = '查無此學號';
    return;
  }

  // 3. 更新餘額顯示
  await updateMealBalanceDisplay(balanceResult.balance);

  // 4. 決定是否顯示點餐按鈕
  const showMealSelection = hasRestaurant && isUserOrderTime();
  const mealSelectionDiv = document.getElementById('mealSelection');
  if (mealSelectionDiv) {
    mealSelectionDiv.style.display = showMealSelection ? 'flex' : 'none';
  }

  // 5. 載入今日餐點
  if (isUserOrderTime() || isOrderEnded()) {
    await loadUserTodayMeals(studentId);
  } else {
    const display = document.getElementById('todayMealDisplay');
    if (display) {
      display.innerHTML = `
        <h3>📋 今日餐點</h3>
        <p style="color: var(--gray);">🕐 點餐時間為 08:00 - 10:00</p>
      `;
    }
  }

  // 6. 載入歷史訂單
  await checkUserOrderHistory();
}

/**
 * 更新餘額顯示
 */
async function updateMealBalanceDisplay(balance) {
  const totalResult = await callApi('getUserTodayTotal', {
    userId: AppState.currentStudentId()
  });

  const currentTotal = (totalResult.success && totalResult.total) || 0;
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
}

/**
 * 載入使用者今日餐點
 */
async function loadUserTodayMeals(studentId) {
  const currentTime = getCurrentTimeNumber();
  const orderStart = TIME.ORDER_START;
  const orderEnd = TIME.ORDER_END;
  const ratingTime = isRatingTime();

  // 顯示柯南載入動畫
  showConanLoading('todayMealDisplay', 'getUserTodayMeals');

  const result = await callApi('getUserTodayMeals', { userId: studentId });
  const container = document.getElementById('todayMealDisplay');
  if (!container) return;

  let html = '<h3>📋 今日餐點</h3>';

  // 點餐時間前：不顯示
  if (currentTime < orderStart) {
    html += `<p style="color: var(--gray);">🕐 點餐時間為 08:00 - 10:00，尚未開始</p>`;
    container.innerHTML = html;
    return;
  }

  // 沒有餐點
  if (!result.success || result.meals.length === 0) {
    if (currentTime >= orderEnd) {
      html += `<p style="color: var(--gray);">⏰ 今日訂餐已截止<br>今日無訂餐</p>`;
    } else {
      html += '<p>今日尚未點餐</p>';
    }
    container.innerHTML = html;
    return;
  }

  // 顯示截止提示
  if (currentTime >= orderEnd) {
    html += `<p style="color: var(--danger); margin-bottom: 8px;">⏰ 今日訂餐已截止</p>`;
  }

  // 顯示評分時間提示
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

  result.meals.forEach(meal => {
    const isNotRated = (!meal.rated || meal.rated === 0 || meal.rated === '' || meal.rated === null);
    const hasRated = meal.rated && meal.rated !== 0 && meal.rated !== '' && meal.rated !== null;

    html += `<li style="padding: 12px; background: #f8f9fa; margin-bottom: 12px; border-radius: 8px;" data-slot="${meal.slotIndex}">`;
    html += `<div><strong>${escapeHtml(meal.name)}</strong> x${meal.amount}</div>`;
    html += `<div style="font-size: 0.8rem; color: var(--gray);">${escapeHtml(meal.store)} - ${escapeHtml(meal.category)}</div>`;

    const showRatingButtons = ratingTime && isNotRated;

    if (showRatingButtons) {
      html += `
        <div class="rating-buttons" data-slot="${meal.slotIndex}" style="display: flex; gap: 6px; margin-top: 10px; flex-wrap: wrap;">
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
    } else if (!ratingTime && currentTime < TIME.RATING_START) {
      html += `<div style="margin-top: 8px; font-size: 0.8rem; color: var(--gray);">🕐 評分將於 12:00 開始</div>`;
    } else if (!ratingTime && currentTime >= TIME.RATING_END) {
      html += `<div style="margin-top: 8px; font-size: 0.8rem; color: var(--gray);">🕐 今日評分已結束</div>`;
    }

    html += `</li>`;
  });

  html += '</ul>';
  container.innerHTML = html;

  // 綁定評分按鈕
  container.querySelectorAll('.rating-btn').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      const rating = parseInt(this.dataset.rating);
      const li = this.closest('li');
      const slotIndex = parseInt(li.dataset.slot);
      submitRating(studentId, slotIndex, rating, li);
    });
  });
}

/**
 * 送出評分
 */
async function submitRating(studentId, slotIndex, rating, liElement) {
  const ratingDiv = liElement.querySelector('.rating-buttons');

  if (ratingDiv) {
    ratingDiv._originalHTML = ratingDiv.innerHTML;
    ratingDiv.innerHTML = '<div style="text-align: center; padding: 8px;"><i class="fas fa-spinner fa-spin"></i> 送出評分中...</div>';
  }

  const result = await callApi('rateMeal', {
    userId: studentId,
    slotIndex: slotIndex,
    rating: rating
  });

  if (result.success) {
    const ratingText = {1: '拉完了', 2: 'NPC', 3: '人上人', 4: '頂級', 5: '夯爆了'};
    const stars = '⭐'.repeat(rating);
    const successHtml = `<div style="margin-top: 8px; font-size: 0.8rem; color: var(--success);">
      <i class="fas fa-check-circle"></i> 已評分：${ratingText[rating]} ${stars} (${rating}分)
    </div>`;

    if (ratingDiv) ratingDiv.remove();
    liElement.insertAdjacentHTML('beforeend', successHtml);

    showMessageModal('✅ 評分成功', result.message);
  } else {
    // 恢復按鈕
    if (ratingDiv && ratingDiv._originalHTML) {
      ratingDiv.innerHTML = ratingDiv._originalHTML;
      // 重新綁定
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
    showMessageModal('❌ 評分失敗', result.message);
  }
}

/**
 * 進入點餐模式
 */
async function enterMealOrderMode(event) {
  let btn = null;
  if (event && event.currentTarget) {
    btn = event.currentTarget;
  } else {
    btn = document.querySelector('#mealSelection .btn-success');
  }

  if (!isUserOrderTime()) {
    showMessageModal('❌ 非點餐時間', '點餐時間為 08:00 - 10:00');
    return;
  }

  if (!AppState.currentStudentId()) {
    showMessageModal('❌ 錯誤', '請先在訂飯頁面輸入學號並載入');
    return;
  }

  if (btn) setButtonLoading(btn, true);

  const result = await callApi('getTodayRestaurant', {});

  if (btn) setButtonLoading(btn, false);

  if (result.success) {
    navigateTo('user-meal-order');
    if (typeof loadMealOrderPage === 'function') loadMealOrderPage();
  } else {
    showMessageModal('❌ 無法點餐', '今日餐廳尚未設定');
  }
}

/**
 * 檢查使用者訂單紀錄
 */
async function checkUserOrderHistory() {
  const studentId = AppState.currentStudentId();
  if (!studentId) return;

  const result = await callApi('getOrderDetails', {});
  const historySection = document.getElementById('userOrderHistorySection');
  const historyContainer = document.getElementById('userOrderHistory');
  const badge = document.getElementById('orderHistoryBadge');

  if (!historySection || !historyContainer) return;

  if (result && result.success && result.orders && result.orders.length > 0) {
    const userOrders = [];
    result.orders.forEach(order => {
      const userItems = order.items.filter(item => item.userId === studentId);
      if (userItems.length > 0) {
        const userOrderTotal = userItems.reduce((sum, item) => sum + item.subtotal, 0);
        userOrders.push({
          orderId: order.orderId,
          timestamp: order.timestamp,
          displayRestaurant: order.displayRestaurant,
          items: userItems,
          orderTotal: userOrderTotal
        });
      }
    });

    if (userOrders.length > 0) {
      historySection.style.display = 'block';
      userOrders.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      const recentOrders = userOrders.slice(0, 10);
      displayUserOrderHistory(recentOrders, historyContainer);

      const displayedTotal = recentOrders.reduce((sum, order) => sum + order.orderTotal, 0);
      let badgeText = `顯示最新 ${recentOrders.length} 筆`;
      if (userOrders.length > 10) badgeText += ` (共 ${userOrders.length} 筆)`;
      badgeText += ` | 小計 $${displayedTotal.toFixed(1)}`;
      if (badge) badge.textContent = badgeText;
    } else {
      historySection.style.display = 'none';
    }
  } else {
    historySection.style.display = 'none';
  }
}

/**
 * 顯示訂單歷史
 */
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
window.enterMealOrderMode = enterMealOrderMode;

console.log('🍽️ 訂飯模組已載入');
