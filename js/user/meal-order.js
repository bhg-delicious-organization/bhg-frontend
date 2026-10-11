// ==================== meal-order.js ====================
// 使用者點餐頁面模組（購物車模式）
// 依賴：supabase.js、state.js、ui.js、common.js、core.js、navigation.js、time.js、preload.js
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

  // 確保時間限制已載入
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

  try {
    const sb = await initSupabase();

    // 並行：讀菜單（快取）+ 讀今日餐點（Supabase）
    const [menuResult, mealsResult] = await Promise.all([
      loadRestaurantMenu(restaurantName),
      sb.from('today_meals')
        .select('slot, restaurant, category, meal_name, amount, price, rated')
        .eq('user_id', studentId)
        .order('slot')
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

    if (!mealsResult.error && mealsResult.data && mealsResult.data.length > 0) {
      cart = mealsResult.data.map(meal => ({
        category: meal.category,
        name: meal.meal_name,
        price: Number(meal.price),
        amount: Number(meal.amount)
      }));
    }

    renderCart();

  } catch (error) {
    console.error('載入點餐頁面失敗:', error);
    const container = document.getElementById('orderMealsList');
    if (container) {
      container.innerHTML = `<div class="message error">❌ ${escapeHtml(error.message || '載入失敗')}</div>`;
    }
  }
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

/**
 * 送出訂單（Supabase 版）
 * 1. 查真實價格
 * 2. 檢查餘額（不扣款）
 * 3. 刪除舊 today_meals
 * 4. 寫入新 today_meals
 */
async function submitOrder(event) {
  const btn = event ? event.currentTarget : document.getElementById('submitOrderBtn');

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

  try {
    const sb = await initSupabase();

    // 1. 查餐廳 ID
    const { data: restaurantData, error: rErr } = await sb
      .from('restaurants')
      .select('id')
      .eq('name', restaurantName)
      .single();

    if (rErr || !restaurantData) {
      throw new Error('找不到餐廳');
    }

    // 2. 查真實價格（防前端竄改）
    const mealNames = cart.map(i => i.name);

    const { data: menuItems, error: mErr } = await sb
      .from('menu_items')
      .select('meal_name, category, price')
      .eq('restaurant_id', restaurantData.id)
      .in('meal_name', mealNames);

    if (mErr || !menuItems) {
      throw new Error('查詢菜單失敗');
    }

    const priceMap = {};
    menuItems.forEach(m => {
      priceMap[m.meal_name] = {
        price: Number(m.price),
        category: m.category
      };
    });

    // 3. 計算總計 + 檢查餘額
    let total = 0;
    const rows = cart.map((item, idx) => {
      const real = priceMap[item.name];
      if (!real) throw new Error(`找不到餐點：${item.name}`);

      const subtotal = real.price * item.amount;
      total += subtotal;

      return {
        user_id: studentId,
        slot: idx +1,
        restaurant: restaurantName,
        category: real.category,
        meal_name: item.name,
        amount: item.amount,
        price: real.price,
        rated: 0
      };
    });

    const { data: userData, error: uErr } = await sb
      .from('users')
      .select('balance')
      .eq('user_id', studentId)
      .single();

    if (uErr || !userData) {
      throw new Error('找不到使用者');
    }

    if (total > Number(userData.balance)) {
      throw new Error(`餘額不足，需要 $${total}，目前 $${userData.balance}`);
    }

    // 4. 刪除舊 today_meals
    const { error: dErr } = await sb
      .from('today_meals')
      .delete()
      .eq('user_id', studentId);

    if (dErr) throw new Error('清空舊餐點失敗：' + dErr.message);

    // 5. 寫入新 today_meals
    const { error: iErr } = await sb
      .from('today_meals')
      .insert(rows);

    if (iErr) throw new Error('寫入餐點失敗：' + iErr.message);

    if (btn) setButtonLoading(btn, false);

    showMessageModal('✅ 送出成功', `訂單已送出，共 ${rows.length} 種餐點，總計 $${total}`);

  } catch (error) {
    if (btn) setButtonLoading(btn, false);
    console.error('送出訂單失敗:', error);
    showMessageModal('❌ 送出失敗', error.message || '請稍後再試');
  }
}

window.loadMealOrderPage = loadMealOrderPage;
window.onRestaurantCategoryChange = onRestaurantCategoryChange;
window.addOrderRestaurantMeal = addOrderRestaurantMeal;
window.submitOrder = submitOrder;

console.log('🍽️ 點餐模組已載入');
