// ==================== meal-order.js ====================
// 使用者點餐頁面模組
// 依賴：api.js、state.js、ui.js、common.js、core.js、navigation.js
// ====================================================

let currentRestaurantCategories = [];
let currentRestaurantItems = [];

/**
 * 載入點餐頁面
 */
function loadMealOrderPage() {
  const studentId = AppState.currentStudentId();
  if (!studentId) {
    showMessageModal('❌ 錯誤', '請先返回訂飯頁面載入學號');
    return;
  }
  loadTodayRestaurantForOrder();
  loadOrderMealsList();
}

/**
 * 載入今日餐廳資訊
 */
async function loadTodayRestaurantForOrder() {
  const restaurantNameEl = document.getElementById('orderTodayRestaurantName');
  const categorySelect = document.getElementById('orderRestaurantCategorySelect');

  if (restaurantNameEl) restaurantNameEl.innerHTML = '<span style="color: var(--gray);">🔍 調查中...</span>';
  if (categorySelect) categorySelect.innerHTML = '<option value="">🔍 調查中...</option>';

  const result = await callApi('getTodayRestaurant', {});

  if (result.success && result.restaurant) {
    if (restaurantNameEl) {
      restaurantNameEl.innerHTML = `<strong style="color: var(--secondary);">${escapeHtml(result.restaurant)}</strong>`;
    }
    loadRestaurantCategories(result.restaurant);
  } else {
    if (restaurantNameEl) restaurantNameEl.innerHTML = '<span style="color: var(--danger);">今日餐廳尚未設定</span>';
    if (categorySelect) categorySelect.innerHTML = '<option value="">無餐廳</option>';
  }
}

/**
 * 載入餐廳分類
 */
async function loadRestaurantCategories(restaurantName) {
  const categorySelect = document.getElementById('orderRestaurantCategorySelect');
  if (!categorySelect) return;

  const result = await callApi('getRestaurantCategories', {
    restaurantName: restaurantName
  });

  if (result.success && result.categories && result.categories.length > 0) {
    currentRestaurantCategories = result.categories;
    categorySelect.innerHTML = '<option value="">請選擇分類</option>';
    result.categories.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat.col;
      option.textContent = cat.name;
      categorySelect.appendChild(option);
    });
  } else {
    categorySelect.innerHTML = '<option value="">無分類資料</option>';
  }
}

/**
 * 分類變更時載入餐點
 */
async function onRestaurantCategoryChange() {
  const categorySelect = document.getElementById('orderRestaurantCategorySelect');
  const itemSelect = document.getElementById('orderRestaurantItemSelect');
  const selectedCol = categorySelect ? categorySelect.value : '';

  if (!selectedCol) {
    if (itemSelect) itemSelect.innerHTML = '<option value="">請先選擇分類</option>';
    currentRestaurantItems = [];
    return;
  }

  const restaurantName = document.getElementById('orderTodayRestaurantName')?.innerText || '';
  if (itemSelect) itemSelect.innerHTML = '<option value="">載入中...</option>';

  const result = await callApi('getCategoryItems', {
    restaurantName: restaurantName,
    categoryCol: parseInt(selectedCol)
  });

  if (result.success && result.items && result.items.length > 0) {
    currentRestaurantItems = result.items;
    if (itemSelect) {
      itemSelect.innerHTML = '<option value="">請選擇餐點</option>';
      result.items.forEach(item => {
        const option = document.createElement('option');
        option.value = JSON.stringify({ name: item.name, price: item.price });
        option.textContent = `${item.name} - $${item.price}`;
        itemSelect.appendChild(option);
      });
    }
  } else {
    if (itemSelect) itemSelect.innerHTML = '<option value="">無餐點資料</option>';
    currentRestaurantItems = [];
  }
}

/**
 * 加入今日餐廳餐點
 */
async function addOrderRestaurantMeal(event) {
  const btn = event ? event.currentTarget : null;
  if (btn) setButtonLoading(btn, true);

  const studentId = AppState.currentStudentId();
  const categorySelect = document.getElementById('orderRestaurantCategorySelect');
  const itemSelect = document.getElementById('orderRestaurantItemSelect');
  const restaurantName = document.getElementById('orderTodayRestaurantName')?.innerText || '';

  if (!categorySelect || !itemSelect || !categorySelect.value || !itemSelect.value) {
    showMessageModal('❌ 輸入錯誤', '請選擇分類和餐點');
    if (btn) setButtonLoading(btn, false);
    return;
  }

  const selectedCategory = categorySelect.options[categorySelect.selectedIndex];
  const selectedItem = itemSelect.options[itemSelect.selectedIndex];
  const itemData = JSON.parse(selectedItem.value);

  const result = await callApi('saveUserMeal', {
    userId: studentId,
    store: restaurantName,
    category: selectedCategory.text,
    mealName: itemData.name,
    price: itemData.price,
    amount: 1
  });

  if (btn) setButtonLoading(btn, false);

  if (result.success) {
    showMessageModal('✅ 加入成功', result.message);
    loadOrderMealsList();
  } else {
    showMessageModal('❌ 加入失敗', result.message);
  }
}

/**
 * 載入已點餐點列表
 */
async function loadOrderMealsList() {
  const studentId = AppState.currentStudentId();
  const container = document.getElementById('orderMealsList');

  if (container) {
    showConanLoading('orderMealsList', 'getUserTodayMeals');
  }

  const result = await callApi('getUserTodayMeals', { userId: studentId });

  if (!container) return;

  if (!result.success || result.meals.length === 0) {
    container.innerHTML = '<p style="color: var(--gray);">尚未點餐</p>';
    return;
  }

  let html = '<div style="display: flex; flex-direction: column; gap: 10px;">';

  result.meals.forEach(meal => {
    html += `
      <div class="meal-item" data-slot="${meal.slotIndex}"
           style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: #f8f9fa; border-radius: 8px;">
        <div>
          <strong>${escapeHtml(meal.name)}</strong>
          <span style="color: var(--gray); font-size: 0.85rem;"> x${meal.amount}</span>
          <div style="font-size: 0.8rem; color: var(--gray);">
            ${escapeHtml(meal.category)} - $${meal.cost}元/份
          </div>
        </div>
        <div>
          <span style="font-weight: bold;">$${meal.total}</span>
          <div style="display: flex; gap: 5px; margin-top: 5px;">
            <button class="btn btn-secondary meal-adjust-btn" data-slot="${meal.slotIndex}" data-change="-1"
                    style="width: auto; padding: 2px 8px;">-</button>
            <span style="min-width: 30px; text-align: center;">${meal.amount}</span>
            <button class="btn btn-secondary meal-adjust-btn" data-slot="${meal.slotIndex}" data-change="1"
                    style="width: auto; padding: 2px 8px;">+</button>
          </div>
        </div>
      </div>
    `;
  });

  html += '</div>';
  container.innerHTML = html;

  // 事件委派
  container.querySelectorAll('.meal-adjust-btn').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      const slotIndex = parseInt(this.dataset.slot);
      const change = parseInt(this.dataset.change);
      const mealItem = this.closest('.meal-item');
      const mealName = mealItem.querySelector('strong').textContent;
      adjustMealQuantity(mealName, change, slotIndex, mealItem);
    });
  });
}

/**
 * 調整餐點數量
 */
async function adjustMealQuantity(mealName, change, slotIndex, mealItem) {
  const studentId = AppState.currentStudentId();
  let originalTexts = [];

  if (mealItem) {
    const allButtons = mealItem.querySelectorAll('button');
    allButtons.forEach((btn, idx) => {
      originalTexts[idx] = btn.innerHTML;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
      btn.disabled = true;
    });
  }

  const result = await callApi('adjustUserMealAmount', {
    userId: studentId,
    mealName: mealName,
    change: change
  });

  if (mealItem) {
    const allButtons = mealItem.querySelectorAll('button');
    allButtons.forEach((btn, idx) => {
      btn.innerHTML = originalTexts[idx];
      btn.disabled = false;
    });
  }

  if (result.success) {
    loadOrderMealsList();
    if (result.message) showMessageModal('✅ 更新成功', result.message);
  } else {
    showMessageModal('❌ 更新失敗', result.message);
  }
}

window.loadMealOrderPage = loadMealOrderPage;
window.onRestaurantCategoryChange = onRestaurantCategoryChange;
window.addOrderRestaurantMeal = addOrderRestaurantMeal;

console.log('🍽️ 點餐模組已載入');
