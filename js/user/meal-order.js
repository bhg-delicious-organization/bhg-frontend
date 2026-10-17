// ==================== meal-order.js ====================
// 使用者點餐頁面模組（購物車模式 + 餘額檢查）
// 依賴：supabase.js、state.js、ui.js、common.js、core.js、navigation.js、time.js、preload.js
// ==================================================

let menuCache = null;
let cart = [];
let userBalance = 0;

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

  await ensureTimeLimitsLoaded();

  if (!isUserOrderTime()) {
    const timeRange = getOrderTimeRange();
    showMessageModal('❌ 非點餐時間', `點餐時間為 ${timeRange}`);
    navigateTo('user-meal');
    return;
  }

  // ⚠️ 修正：AppState 沒有就從 Supabase 讀
  let restaurantName = AppState.currentRestaurantName();

  if (!restaurantName) {
    console.log('⚠️ AppState 無餐廳，從 Supabase 讀取...');
    try {
      const sb = await initSupabase();
      const { data: setting } = await sb
        .from('system_settings')
        .select('value')
        .eq('key', 'today_restaurant')
        .maybeSingle();

      restaurantName = setting?.value || '';
      if (restaurantName) {
        AppState.setCurrentRestaurantName(restaurantName);
        console.log('✅ 已從 Supabase 載入餐廳:', restaurantName);
      }
    } catch (e) {
      console.warn('從 Supabase 讀取餐廳失敗:', e);
    }
  }

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
  userBalance = 0;

  showConanLoading('orderMealsList', 'getRestaurantMenu');

  try {
    const sb = await initSupabase();

    const [menuResult, mealsResult, userResult] = await Promise.all([
      loadRestaurantMenu(restaurantName),
      sb.from('today_meals')
        .select('slot, restaurant, category, meal_name, amount, price, rated')
        .eq('user_id', studentId)
        .order('slot'),
      sb.from('users')
        .select('balance')
        .eq('user_id', studentId)
        .maybeSingle()
    ]);

    if (userResult.data) {
      userBalance = Number(userResult.data.balance) || 0;
    }

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
    container.innerHTML = `
      <p style="color: var(--gray);">尚未點餐</p>
      <div style="margin-top: 15px; padding: 15px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 8px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span>💰 目前餘額</span>
          <span style="font-size: 1.3rem; font-weight: bold;">$${userBalance}</span>
        </div>
      </div>
    `;

    const submitBtn = document.getElementById('submitOrderBtn');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.style.opacity = '0.5';
      submitBtn.style.cursor = 'not-allowed';
    }
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

  const remaining = userBalance - grandTotal;
  const isOverBudget = remaining < 0;

  html += `
    <div style="margin-top: 15px; padding: 15px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 8px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <span>💰 目前餘額</span>
        <span style="font-weight: bold;">$${userBalance}</span>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <span>🍱 今日餐點總計</span>
        <span style="font-weight: bold;">$${grandTotal}</span>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.3);">
        <span><strong>${isOverBudget ? '不足金額' : '剩餘可用'}</strong></span>
        <span style="font-size: 1.3rem; font-weight: bold; ${isOverBudget ? 'color: #ffcccc;' : ''}">
          ${isOverBudget ? `-$${Math.abs(remaining)}` : `$${remaining}`}
        </span>
      </div>
    </div>
  `;

  if (isOverBudget) {
    html += `
      <div class="message error" style="margin-top: 10px;">
        <i class="fas fa-exclamation-triangle"></i>
        餘額不足！還需要 <strong>$${Math.abs(remaining)}</strong>，請先儲值或減少餐點。
      </div>
    `;
  }

  container.innerHTML = html;

  container.querySelectorAll('.meal-adjust-btn').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      const idx = parseInt(this.dataset.idx);
      const change = parseInt(this.dataset.change);
      adjustCartItem(idx, change);
    });
  });

  const submitBtn = document.getElementById('submitOrderBtn');
  if (submitBtn) {
    if (isOverBudget || cart.length === 0) {
      submitBtn.disabled = true;
      submitBtn.style.opacity = '0.5';
      submitBtn.style.cursor = 'not-allowed';
    } else {
      submitBtn.disabled = false;
      submitBtn.style.opacity = '';
      submitBtn.style.cursor = '';
    }
  }
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

    // 3. 檢查每個餐點都存在
    let total = 0;
    const itemsPayload = cart.map(item => {
      const real = priceMap[item.name];
      if (!real) throw new Error(`找不到餐點：${item.name}`);

      const subtotal = real.price * item.amount;
      total += subtotal;

      return {
        category: real.category,
        meal_name: item.name,
        amount: item.amount,
        price: real.price
      };
    });

    // 4. 檢查使用者餘額（前端先驗證）
    const { data: userData, error: uErr } = await sb
      .from('users')
      .select('balance')
      .eq('user_id', studentId)
      .maybeSingle();

    if (uErr || !userData) {
      throw new Error('找不到使用者');
    }

    if (total > Number(userData.balance)) {
      throw new Error(`餘額不足，需要 $${total}，目前 $${userData.balance}`);
    }

    // 5. 用 RPC 原子送出（刪除+寫入）
    const { data: rpcResult, error: rpcError } = await sb.rpc('submit_order', {
      p_user_id: studentId,
      p_restaurant: restaurantName,
      p_items: itemsPayload
    });

    if (btn) setButtonLoading(btn, false);

    if (rpcError) {
      throw new Error(rpcError.message);
    }

    if (!rpcResult || !rpcResult.success) {
      throw new Error(rpcResult?.message || '送出失敗');
    }

    showMessageModal('✅ 送出成功', `訂單已送出，共 ${rpcResult.itemCount} 種餐點，總計 $${rpcResult.total}`);

    // 更新餘額顯示
    userBalance = Number(userData.balance);

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

console.log('🍽️ 點餐模組已載入（餘額檢查版）');
