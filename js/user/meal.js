<script>
// ==================== meal.js ====================
// 使用者訂飯模組（訂飯頁面）
// 依賴：api.js、state.js、ui.js、time.js、common.js、core.js、navigation.js
// ==================================================

async function loadMealInfo(event) {
  let btn = null;
  if (event && event.currentTarget) {
    btn = event.currentTarget;
  } else {
    btn = document.querySelector('#page-user-meal .btn-primary');
  }

  const inputElement = document.getElementById('mealStudentId');
  if (!inputElement) {
    console.warn('⚠️ 訂飯頁面尚未載入，跳過 loadMealInfo');
    return;
  }

  const studentId = inputElement.value.trim();
  if (!studentId) {
    showMessageModal('❌ 輸入錯誤', '請輸入學號');
    return;
  }

  AppState.setCurrentStudentId(studentId);

  if (btn) setButtonLoading(btn, true);

  const restaurantResult = await callApi('getTodayRestaurant', {});
  const hasRestaurant = restaurantResult.success && restaurantResult.restaurant;

  const balanceResult = await callApi('getUserBalance', { userId: studentId });

  if (btn) setButtonLoading(btn, false);

  if (!balanceResult.success) {
    const box = document.getElementById('mealBalanceBox');
    if (box) box.textContent = '查無此學號';
    return;
  }

  await updateMealBalanceDisplay(balanceResult.balance);

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
}

async function updateMealBalanceDisplay(balance) {
  // ✅ 改用 getUserTodayMeals，前端加總（避免依賴公式）
  const mealsResult = await callApi('getUserTodayMeals', {
    userId: AppState.currentStudentId()
  });

  let currentTotal = 0;
  if (mealsResult.success && mealsResult.meals) {
    mealsResult.meals.forEach(meal => {
      currentTotal += (meal.amount || 0) * (meal.cost || 0);
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
}

async function loadUserTodayMeals(studentId) {
  const currentTime = getCurrentTimeNumber();
  const orderStart = TIME.ORDER_START;
  const orderEnd = TIME.ORDER_END;
  const ratingTime = isRatingTime();

  showConanLoading('todayMealDisplay', 'getUserTodayMeals');

  const result = await callApi('getUserTodayMeals', { userId: studentId });
  const container = document.getElementById('todayMealDisplay');
  if (!container) return;

  let html = '<h3>📋 今日餐點</h3>';

  // ✅ 動態時間範圍
  const timeRange = getOrderTimeRange();

  if (currentTime < orderStart) {
    html += `<p style="color: var(--gray);">🕐 點餐時間為 ${timeRange}，尚未開始</p>`;
    container.innerHTML = html;
    return;
  }

  if (!result.success || result.meals.length === 0) {
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
    showMessageModal('❌ 評分失敗', result.message);
  }
}

async function enterMealOrderMode(event) {
  let btn = null;
  if (event && event.currentTarget) {
    btn = event.currentTarget;
  } else {
    btn = document.querySelector('#mealSelection .btn-success');
  }

  // ✅ 動態時間範圍
  if (!isUserOrderTime()) {
    const timeRange = getOrderTimeRange();
    showMessageModal('❌ 非點餐時間', `點餐時間為 ${timeRange}`);
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

async function checkUserOrderHistory
