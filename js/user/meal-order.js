// ==================== meal-order.js ====================
// 使用者點餐頁面模組（購物車模式）
// 依賴：api.js、state.js、ui.js、common.js、core.js、navigation.js、time.js
// ==================================================

let menuCache = null;
let cart = [];

/**
 * 載入點餐頁面
 */
async function loadMealOrderPage() {
  const studentId = AppState.currentStudentId();
  if (!studentId) {
    showMessageModal('❌ 錯誤', '請先返回訂飯頁面載入學號');
    navigateTo('user-meal');
    return;
  }

  // ✅ 確保時間限制已載入
  await ensureTimeLimitsLoaded();

  if (!isUserOrderTime()) {
    const timeRange = getOrderTimeRange();
    showMessageModal('❌ 非點餐時間', `點餐時間為 ${timeRange}`);
    navigateTo('user-meal');
    return;
  }

  const restaurantName = AppState.currentRestaurantName();
  if (!restaurantName) {
    showMessageModal('❌ 今日餐廳尚未設定', '請稍後再試');
    navigateTo('user-meal');
    return;
  }

  const restaurantNameEl = document.getElementById('orderTodayRestaurantName');
  if (restaurantNameEl) {
    restaurantNameEl.innerHTML = `<strong style="color: var(--secondary);">${escapeHtml(restaurantName)}</strong>`;
  }

  cart = [];
  menuCache = null;

  showConanLoading('orderMealsList', 'getRestaurantMenu');

  const [menuResult, mealsResult] = await Promise.all([
    callApi('getRestaurantMenu', { restaurantName: restaurantName }),
    callApi('getUserTodayMeals', { userId: studentId })
  ]);

  if (!menuResult.success) {
    const container = document.getElementById('orderMealsList');
    if (container) {
      container.innerHTML = `<div class="message error">❌ ${escapeHtml(menuResult.message || '載入菜單失敗')}</div>`;
    }
    return;
  }

  menuCache = menuResult;
  renderCategorySelect(menuResult.categories);

  if (mealsResult.success && mealsResult.meals && mealsResult.meals.length > 0) {
    cart = mealsResult.meals.map(meal => ({
      category: meal.category,
      name: meal.name,
      price: meal.cost,
      amount: meal.amount
    }));
  }

  renderCart();
}

function renderCategorySelect(categories) {
  const select = document.getElementById('orderRestaurantCategorySelect');
  if (!select) return;

  select.innerHTML = '<option value="">請選擇分類</option>';
  categories.forEach((cat, idx) => {
    const option = document.createElement('option');
    option.value = idx;
    option.textContent = cat.name;
    select.appendChild(option);
  });

  const itemSelect = document.getElementById('orderRestaurantItemSelect');
  if (itemSelect) {
    itemSelect.innerHTML = '<option value="">請先選擇分類</option>';
  }
}

function onRestaurantCategoryChange() {
  const select = document.getElementById('orderRestaurantCategorySelect');
  const itemSelect = document.getElementById('orderRestaurantItemSelect');
  if (!select || !itemSelect) return;

  const idx = select.value;
  if (idx === '') {
    itemSelect.innerHTML = '<option value="">請先選擇分類</option>';
    return;
  }

  const category = menuCache.categories[parseInt(idx)];
  itemSelect.innerHTML = '<option value="">請選擇餐點</option>';

  category.items.forEach((item, itemIdx) => {
    const option = document.createElement('option');
    option.value = itemIdx;
    option.textContent = `${item.name} - $${item.price}`;
    itemSelect.appendChild(option);
  });
}

function addOrderRestaurantMeal() {
  const catSelect = document.getElementById('orderRestaurantCategorySelect');
  const itemSelect = document.getElementById('orderRestaurantItemSelect');

  if (!catSelect || !itemSelect) return;

  const catIdx = catSelect.value;
  const itemIdx = itemSelect.value;

  if (catIdx === '' || itemIdx === '') {
    showMessageModal('❌ 輸入錯誤', '請選擇分類和餐點');
    return;
  }

  const category = menuCache.categories[parseInt(catIdx)];
  const item = category.items[parseInt(itemIdx)];

  const existing = cart.find(c => c.name === item.name && c.category === category.name);

  if (existing) {
    existing.amount += 1;
  } else {
    cart.push({
      category: category.name,
      name: item.name,
      price: item.price,
      amount: 1
    });
  }

  renderCart();
  showMessageModal('✅ 已加入', `${item.name} x1`);
}

function renderCart() {
  const container = document.getElementById('orderMealsList');
  if (!container) return;

  if (cart.length === 0) {
    container.innerHTML = '<p style="color: var(--gray);">尚未點餐</p>';
    return;
  }

  let html = '<div style="display: flex; flex-direction: column; gap: 10px;">';
  let grandTotal = 0;

  cart.forEach((item, idx) => {
    const total = item.amount * item.price;
    grandTotal += total;

    html += `
      <div class="meal-item" data-idx="${idx}"
           style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: #f8f9fa; border-radius: 8px;">
        <div>
          <strong>${escapeHtml(item.name)}</strong>
          <span style="color: var(--gray); font-size: 0.85rem;"> x${item.amount}</span>
          <div style="font-size: 0.8rem; color: var(--gray);">
            ${escapeHtml(item.category)} - $${item.price}元/份
          </div>
        </div>
        <div>
          <span style="font-weight: bold;">$${total}</span>
          <div style="display: flex; gap: 5px; margin-top: 5px;">
            <button class="btn btn-secondary meal-adjust-btn" data-idx="${idx}" data-change="-1"
                    style="width: auto; padding: 2px 8px;">-</button>
            <span style="min-width: 30px; text-align: center;">${item.amount}</span>
            <button class="btn btn-secondary meal-adjust-btn" data-idx="${idx}" data-change="1"
                    style="width: auto; padding: 2px 8px;">+</button>
          </div>
        </div>
      </div>
    `;
  });

  html += '</div>';

  html += `
    <div style="margin-top: 15px; padding: 15px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 8px;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span><i class="fas fa-calculator"></i> <strong>今日餐點總計</strong></span>
        <span style="font-size: 1.3rem; font-weight: bold;">$${grandTotal}</span>
      </div>
    </div>
  `;

  container.innerHTML = html;

  container.querySelectorAll('.meal-adjust-btn').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      const idx = parseInt(this.dataset.idx);
      const change = parseInt(this.dataset.change);
      adjustCartItem(idx, change);
    });
  });
}

function adjustCartItem(idx, change) {
  if (idx < 0 || idx >= cart.length) return;

  cart[idx].amount += change;

  if (cart[idx].amount <= 0) {
    cart.splice(idx, 1);
  }

  renderCart();
}

async function submitOrder(event) {
  const btn = event ? event.currentTarget : document.getElementById('submitOrderBtn');

  // ✅ 確保時間限制已載入
  await ensureTimeLimitsLoaded();

  if (!isUserOrderTime()) {
    showMessageModal('❌ 非點餐時間', '點餐時間已過，無法送出');
    return;
  }

  if (cart.length === 0) {
    showMessageModal('❌ 錯誤', '尚未點任何餐點');
    return;
  }

  const studentId = AppState.currentStudentId();
  const restaurantName = AppState.currentRestaurantName();

  if (!studentId || !restaurantName) {
    showMessageModal('❌ 錯誤', '資料不完整，請重新載入頁面');
    return;
  }

  if (btn) setButtonLoading(btn, true);

  const result = await callApi('submitOrder', {
    userId: studentId,
    restaurant: restaurantName,
    items: cart.map(item => ({
      category: item.category,
      name: item.name,
      price: item.price,
      amount: item.amount
    }))
  });

  if (btn) setButtonLoading(btn, false);

  if (result.success) {
    showMessageModal('✅ 送出成功', result.message || `訂單已送出，總計 $${result.total || 0}`);
  } else {
    showMessageModal('❌ 送出失敗', result.message || '請稍後再試');
  }
}

window.loadMealOrderPage = loadMealOrderPage;
window.onRestaurantCategoryChange = onRestaurantCategoryChange;
window.addOrderRestaurantMeal = addOrderRestaurantMeal;
window.submitOrder = submitOrder;

console.log('🍽️ 點餐模組已載入');
