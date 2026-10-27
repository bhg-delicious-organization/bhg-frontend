// ==================== meal-order.js ====================
// 使用者點餐頁面模組（防死鎖、防無限迴圈、超時保護）
// ====================================================

let menuCache = null;
let cart = [];
let userBalance = 0;
let isMealOrderLoading = false; // ★ 防止重複載入的鎖

/**
 * 載入點餐頁面
 */
async function loadMealOrderPage() {
  // ★ 如果正在載入中，直接中斷，防止無限迴圈
  if (isMealOrderLoading) {
    console.log('⏳ 點餐頁面正在載入中，跳過重複請求...');
    return;
  }

  const container = document.getElementById('orderMealsList');
  
  // 如果不是管理員，且沒有學號，顯示錯誤
  const studentId = AppState.currentStudentId();
  if (!studentId) {
    if (container) container.innerHTML = '<div class="message error">❌ 請先登入學生帳號才能點餐</div>';
    return;
  }

  isMealOrderLoading = true; // 上鎖

  try {
    await ensureTimeLimitsLoaded();
    await ensureTodayRestaurantLoaded();

    // 狀態檢查（★ 不跳轉，直接顯示錯誤）
    if (AppState.todayStatus() !== 'open') {
      if (container) container.innerHTML = '<div class="message error">❌ 今日訂餐已截止，無法點餐</div>';
      return;
    }

    if (!isUserOrderTime()) {
      if (container) container.innerHTML = `<div class="message error">❌ 非點餐時間（${getOrderTimeRange()}）</div>`;
      return;
    }

    let restaurantName = AppState.currentRestaurantName();
    if (!restaurantName) {
      // 從 Supabase 補救一次
      const sb = await initSupabase();
      const { data } = await sb.from('system_settings').select('value').eq('key', 'today_restaurant').maybeSingle();
      restaurantName = data?.value || '';
      if (restaurantName) AppState.setCurrentRestaurantName(restaurantName);
    }

    if (!restaurantName) {
      if (container) container.innerHTML = '<div class="message error">❌ 今日餐廳尚未設定</div>';
      return;
    }

    // 顯示餐廳名稱
    const restaurantNameEl = document.getElementById('orderTodayRestaurantName');
    if (restaurantNameEl) {
      restaurantNameEl.innerHTML = `<strong style="color: var(--secondary);">${escapeHtml(restaurantName)}</strong>`;
    }

    cart = [];
    menuCache = null;
    userBalance = 0;

    if (container) showConanLoading('orderMealsList', 'getRestaurantMenu');

    const sb = await initSupabase();

    // ★ 加上超時保護（10 秒），避免其中一個 API 卡死
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('連線逾時，請檢查網路')), 10000)
    );

    const fetchDataPromise = Promise.all([
      loadRestaurantMenu(restaurantName),
      sb.from('today_meals').select('slot, restaurant, category, meal_name, amount, price, rated').eq('user_id', studentId).eq('is_archived', false).order('slot'),
      sb.from('users').select('balance').eq('user_id', studentId).maybeSingle()
    ]);

    // 競爭：看是資料先回來，還是超時先發生
    const [menuResult, mealsResult, userResult] = await Promise.race([fetchDataPromise, timeoutPromise]);

    if (userResult.data) {
      userBalance = Number(userResult.data.balance) || 0;
    }

    if (!menuResult.success) {
      if (container) container.innerHTML = `<div class="message error">❌ ${escapeHtml(menuResult.message || '載入菜單失敗')}</div>`;
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
    if (container) {
      container.innerHTML = `<div class="message error">❌ ${escapeHtml(error.message || '載入失敗')}</div>`;
    }
  } finally {
    isMealOrderLoading = false; // ★ 解鎖
  }
}

// ... 以下 renderCategorySelect, onRestaurantCategoryChange, addOrderRestaurantMeal, renderCart, adjustCartItem, submitOrder 保持不變 ...

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

async function submitOrder(event) {
  const btn = event ? event.currentTarget : document.getElementById('submitOrderBtn');

  await ensureTimeLimitsLoaded();
  await ensureTodayRestaurantLoaded();

  if (AppState.todayStatus() !== 'open') {
    showMessageModal('❌ 無法送出', '今日訂餐已截止，無法送出訂單');
    return;
  }

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

    const itemsPayload = cart.map(item => ({
      meal_name: item.name,
      amount: item.amount
    }));

    const { data: rpcResult, error: rpcError } = await sb.rpc('submit_order', {
      p_user_id: studentId,
      p_restaurant: restaurantName,
      p_items: itemsPayload
    });

    if (btn) setButtonLoading(btn, false);

    if (rpcError) {
      throw new Error(rpcError.message);
    }

    assertRpcSuccess(rpcResult, 'submit_order');

    showMessageModal(
      '✅ 送出成功',
      `訂單已送出，共 ${rpcResult.itemCount} 種餐點，總計 $${rpcResult.total}`
    );

    cart = [];

    if (typeof loadMealOrderPage === 'function') {
      await loadMealOrderPage();
    }

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

console.log('🍽️ 點餐模組已載入（防死鎖優化版）');
