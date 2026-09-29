// ==================== restaurant.js ====================
// 管理員餐廳管理模組
// 依賴：api.js、state.js、ui.js、common.js、core.js
// ====================================================

/**
 * 載入今日餐廳設定狀態
 */
async function loadTodayRestaurantStatus() {
  const statusDiv = document.getElementById('todayRestaurantStatus');
  const selectContainer = document.getElementById('restaurantSelectContainer');
  const statusText = document.getElementById('todayRestaurantText');

  if (!statusDiv || !statusText) return;

  const result = await callApi('getTodayRestaurant', {});

  if (result.success && result.restaurant) {
    statusText.innerHTML = `✅ 今日餐廳：<strong>${escapeHtml(result.restaurant)}</strong>（已設定，無法修改）`;
    statusDiv.style.backgroundColor = '#f0fdf4';
    statusDiv.style.borderLeftColor = '#10b981';
    if (selectContainer) selectContainer.style.display = 'none';
  } else {
    statusText.innerHTML = `⏳ 今日餐廳尚未設定，請選擇：`;
    statusDiv.style.backgroundColor = '#fff7ed';
    statusDiv.style.borderLeftColor = '#f97316';
    if (selectContainer) selectContainer.style.display = 'block';
    loadRestaurantOptions();
  }
}

/**
 * 載入餐廳選項
 */
async function loadRestaurantOptions() {
  const select = document.getElementById('restaurantSelect');
  if (!select) return;

  select.innerHTML = '<option value="">載入中...</option>';

  const result = await callAdminApi('getAllStores', {});

  if (result.success && result.stores) {
    select.innerHTML = '<option value="">請選擇餐廳</option>';
    result.stores.forEach(store => {
      const option = document.createElement('option');
      option.value = store;
      option.textContent = store;
      select.appendChild(option);
    });
  } else {
    select.innerHTML = '<option value="">載入失敗</option>';
  }
}

/**
 * 設定今日餐廳
 */
async function setTodayRestaurant(event) {
  const select = document.getElementById('restaurantSelect');
  const restaurantName = select ? select.value : '';

  if (!restaurantName) {
    showMessageModal('❌ 錯誤', '請選擇餐廳');
    return;
  }

  const btn = event ? event.currentTarget : null;
  if (btn) setButtonLoading(btn, true);

  const resultDiv = document.getElementById('restaurantResult');
  if (resultDiv) resultDiv.innerHTML = '<div class="loading"><div class="spinner"></div>設定中...</div>';

  const result = await callAdminApi('setTodayRestaurant', {
    restaurantName: restaurantName
  });

  if (btn) setButtonLoading(btn, false);

  if (result.success) {
    if (resultDiv) resultDiv.innerHTML = `<div class="message success">✅ ${escapeHtml(result.message)}</div>`;
    loadTodayRestaurantStatus();
  } else {
    if (resultDiv) resultDiv.innerHTML = `<div class="message error">❌ ${escapeHtml(result.message)}</div>`;
  }
}

/**
 * 顯示今日餐廳統計
 */
async function showTodayRestaurantStats(event) {
  const btn = event ? event.currentTarget : null;
  if (btn) setButtonLoading(btn, true);

  const resultDiv = document.getElementById('mealStatsResult');
  if (resultDiv) resultDiv.innerHTML = '<div class="loading"><div class="spinner"></div><p>統計中...</p></div>';

  const result = await callAdminApi('getTodayRestaurantStats', {});

  if (btn) setButtonLoading(btn, false);

  if (!result.success) {
    if (resultDiv) resultDiv.innerHTML = `<div class="message error">❌ ${escapeHtml(result.message)}</div>`;
    return;
  }

  if (!result.restaurant.items || result.restaurant.items.length === 0) {
    if (resultDiv) resultDiv.innerHTML = '<div class="message info">暫無餐點資料</div>';
    return;
  }

  let totalCount = 0;
  let html = `<h4 style="margin-bottom: 10px;">🍽️ ${escapeHtml(result.restaurant.name)} 餐點統計</h4>`;
  html += '<div class="table-container"><table class="table">';
  html += '<tr><th>種類</th><th>品項</th><th>數量</th></tr>';
  result.restaurant.items.forEach(item => {
    html += `<tr><td>${escapeHtml(item.category)}</td><td>${escapeHtml(item.name)}</td><td>${item.count}</td></tr>`;
    totalCount += item.count;
  });
  html += '</table></div>';
  html += `<p style="margin-top: 8px; color: var(--gray); font-size: 0.9rem;">總份數：${totalCount} 份</p>`;

  if (resultDiv) resultDiv.innerHTML = html;
}

/**
 * 複製餐廳統計文字
 */
async function copyRestaurantStatsList(event) {
  const btn = event ? event.currentTarget : null;
  if (btn) setButtonLoading(btn, true);

  const result = await callAdminApi('generateRestaurantStatsList', {});

  if (btn) setButtonLoading(btn, false);

  if (result.success) {
    try {
      await copyToClipboard(result.text);
      showMessageModal('✅ 成功', `已複製 ${result.restaurantName} 餐點統計`);
    } catch (err) {
      showMessageModal('❌ 錯誤', '複製失敗，請手動選取');
    }
  } else {
    showMessageModal('❌ 錯誤', result.message || '產生統計失敗');
  }
}

/**
 * 管理員截止訂餐
 */
function cutOffOrder() {
  showConfirmModal(
    '⚠️ 截止訂餐',
    '確定要截止訂餐並計算所有人扣款嗎？',
    async function() {
      const btn = document.querySelector('#page-admin-restaurant .btn-warning');
      if (btn) setButtonLoading(btn, true);

      const resultDiv = document.getElementById('cutOffResult');
      if (resultDiv) resultDiv.innerHTML = '<div class="loading"><div class="spinner"></div>截止中...</div>';

      const result = await callAdminApi('cutOffOrder', {});

      if (btn) setButtonLoading(btn, false);

      if (result.success) {
        showMessageModal('✅ 截止訂餐', result.message);
        loadTodayRestaurantStatus();
      } else {
        showMessageModal('❌ 截止失敗', result.message);
      }
    }
  );
}

window.loadTodayRestaurantStatus = loadTodayRestaurantStatus;
window.setTodayRestaurant = setTodayRestaurant;
window.showTodayRestaurantStats = showTodayRestaurantStats;
window.copyRestaurantStatsList = copyRestaurantStatsList;
window.cutOffOrder = cutOffOrder;

console.log('🏪 餐廳模組已載入');
