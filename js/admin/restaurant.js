// ==================== restaurant.js ====================
// 管理員餐廳管理模組（Supabase 版）
// 依賴：supabase.js、state.js、ui.js、common.js、core.js
// ==================================================

function setEndTimeQuick(time) {
  const input = document.getElementById('orderEndTimeInput');
  if (input) input.value = time;
}

function formatTimeStr(time) {
  if (Number(time) >= 2400) return '全天候';
  const hour = Math.floor(time / 100);
  const minute = time % 100;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

async function loadTodayRestaurantStatus() {
  const statusDiv = document.getElementById('todayRestaurantStatus');
  const selectContainer = document.getElementById('restaurantSelectContainer');
  const statusText = document.getElementById('todayRestaurantText');

  if (!statusDiv || !statusText) return;

  await ensureTimeLimitsLoaded();

  try {
    const sb = await initSupabase();

    const { data: setting } = await sb
      .from('system_settings')
      .select('value')
      .eq('key', 'today_restaurant')
      .maybeSingle();

    const restaurant = setting?.value || '';

    if (restaurant) {
      let endTimeStr = '10:00';
      try {
        const { data: endSetting } = await sb
          .from('system_settings')
          .select('value')
          .eq('key', 'today_order_end')
          .maybeSingle();
        if (endSetting?.value) {
          endTimeStr = formatTimeStr(parseInt(endSetting.value));
        }
      } catch (e) {
        console.warn('讀取截止時間失敗:', e);
      }

      statusText.innerHTML = `✅ 今日餐廳：<strong>${escapeHtml(restaurant)}</strong><br>⏰ 截止時間：<strong>${endTimeStr}</strong>（已設定，無法修改）`;
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
  } catch (error) {
    console.error('載入今日餐廳狀態失敗:', error);
    statusText.textContent = '載入失敗';
  }
}

async function loadRestaurantOptions() {
  const select = document.getElementById('restaurantSelect');
  if (!select) return;

  select.innerHTML = '<option value="">載入中...</option>';

  try {
    const sb = await initSupabase();

    const { data: stores, error } = await sb
      .from('restaurants')
      .select('name')
      .eq('is_active', true)
      .order('name');

    if (error || !stores) {
      select.innerHTML = '<option value="">載入失敗</option>';
      return;
    }

    select.innerHTML = '<option value="">請選擇餐廳</option>';
    stores.forEach(store => {
      const option = document.createElement('option');
      option.value = store.name;
      option.textContent = store.name;
      select.appendChild(option);
    });
  } catch (error) {
    console.error('載入餐廳選項失敗:', error);
    select.innerHTML = '<option value="">載入失敗</option>';
  }
}

async function setTodayRestaurant(event) {
  const select = document.getElementById('restaurantSelect');
  const endTimeInput = document.getElementById('orderEndTimeInput');

  const restaurantName = select ? select.value : '';
  const orderEndTime = endTimeInput ? endTimeInput.value : '1000';

  if (!restaurantName) {
    showMessageModal('❌ 錯誤', '請選擇餐廳');
    return;
  }

  if (!orderEndTime || isNaN(orderEndTime) || orderEndTime < 0 || orderEndTime > 2400) {
    showMessageModal('❌ 錯誤', '請輸入有效的截止時間（0-2400）');
    return;
  }

  const endTimeStr = formatTimeStr(orderEndTime);

  showConfirmModal(
    '⚠️ 確認設定餐廳',
    `餐廳：${restaurantName}\n點餐截止：${endTimeStr}\n\n確定要設定嗎？\n（設定後無法修改）`,
    function() { doSetTodayRestaurant(restaurantName, orderEndTime, event); }
  );
}

async function doSetTodayRestaurant(restaurantName, orderEndTime, event) {
  const btn = event ? event.currentTarget : null;
  if (btn) setButtonLoading(btn, true);

  const resultDiv = document.getElementById('restaurantResult');
  if (resultDiv) showConanLoading('restaurantResult', 'setTodayRestaurant');

  try {
    const sb = await initSupabase();

    // 用 RPC 原子寫入
    const { data, error } = await sb.rpc('set_today_restaurant', {
      p_restaurant: restaurantName,
      p_order_end: String(orderEndTime)
    });

    if (btn) setButtonLoading(btn, false);

    if (error) {
      throw new Error(error.message);
    }

    assertRpcSuccess(data, 'set_today_restaurant');

    if (!data || !data.success) {
      throw new Error(data?.message || '設定失敗');
    }

    // 更新前端狀態
    AppState.setCurrentRestaurantName(restaurantName);
    TIME.ORDER_END = parseInt(orderEndTime);

    if (typeof clearTodayRestaurantCache === 'function') clearTodayRestaurantCache();
    if (typeof clearRestaurantMenuCache === 'function') clearRestaurantMenuCache();

    if (resultDiv) {
      resultDiv.innerHTML = `<div class="message success">✅ 今日餐廳「${escapeHtml(restaurantName)}」設定成功，截止時間 ${formatTimeStr(orderEndTime)}</div>`;
    }

    // 發通知（走 GAS）
    try {
      await fetch('https://script.google.com/macros/s/AKfycbwGpChoVd0K6InXzM6T962y0y5bLcVwNCJO0uy1RIcsyrMmz7-q5CMcNlh_9qDZfDPXUA/exec', {
        method: 'POST',
        body: JSON.stringify({
          action: 'notifyTodayRestaurant',
          data: { restaurantName, orderEndTime }
        })
      });
    } catch (notifyErr) {
      console.warn('發通知失敗:', notifyErr);
    }

    loadTodayRestaurantStatus();

  } catch (error) {
    if (btn) setButtonLoading(btn, false);
    console.error('設定餐廳失敗:', error);
    if (resultDiv) {
      resultDiv.innerHTML = `<div class="message error">❌ ${escapeHtml(error.message)}</div>`;
    }
  }
}

async function showTodayRestaurantStats(event) {
  const btn = event ? event.currentTarget : null;
  if (btn) setButtonLoading(btn, true);

  const resultDiv = document.getElementById('mealStatsResult');
  if (resultDiv) showConanLoading('mealStatsResult', 'getTodayRestaurantStats');

  try {
    const sb = await initSupabase();

    const { data: setting } = await sb
      .from('system_settings')
      .select('value')
      .eq('key', 'today_restaurant')
      .maybeSingle();

    const restaurantName = setting?.value || '';
    if (!restaurantName) throw new Error('今日餐廳尚未設定');

    const { data: restData } = await sb
      .from('restaurants')
      .select('id')
      .eq('name', restaurantName)
      .maybeSingle();

    if (!restData) throw new Error('找不到餐廳');

    const { data: items, error } = await sb
      .from('menu_items')
      .select('category, meal_name, price, order_count')
      .eq('restaurant_id', restData.id)
      .gt('order_count', 0)
      .order('category')
      .order('meal_name');

    if (btn) setButtonLoading(btn, false);

    if (error) throw new Error(error.message);

    if (!items || items.length === 0) {
      if (resultDiv) resultDiv.innerHTML = '<div class="message info">暫無餐點資料</div>';
      return;
    }

    let totalCount = 0;
    let html = `<h4 style="margin-bottom: 10px;">🍽️ ${escapeHtml(restaurantName)} 餐點統計</h4>`;
    html += '<div class="table-container"><table class="table">';
    html += '<tr><th>種類</th><th>品項</th><th>數量</th></tr>';
    items.forEach(item => {
      html += `<tr><td>${escapeHtml(item.category)}</td><td>${escapeHtml(item.meal_name)}</td><td>${item.order_count}</td></tr>`;
      totalCount += Number(item.order_count);
    });
    html += '</table></div>';
    html += `<p style="margin-top: 8px; color: var(--gray); font-size: 0.9rem;">總份數：${totalCount} 份</p>`;

    if (resultDiv) resultDiv.innerHTML = html;

  } catch (error) {
    if (btn) setButtonLoading(btn, false);
    console.error('載入餐點統計失敗:', error);
    if (resultDiv) resultDiv.innerHTML = `<div class="message error">❌ ${escapeHtml(error.message)}</div>`;
  }
}

async function copyRestaurantStatsList(event) {
  const btn = event ? event.currentTarget : null;
  if (btn) setButtonLoading(btn, true);

  try {
    const sb = await initSupabase();

    const { data: setting } = await sb
      .from('system_settings')
      .select('value')
      .eq('key', 'today_restaurant')
      .maybeSingle();

    const restaurantName = setting?.value || '';
    if (!restaurantName) throw new Error('今日餐廳尚未設定');

    const { data: restData } = await sb
      .from('restaurants')
      .select('id')
      .eq('name', restaurantName)
      .maybeSingle();

    const { data: items, error } = await sb
      .from('menu_items')
      .select('category, meal_name, price, order_count')
      .eq('restaurant_id', restData.id)
      .gt('order_count', 0)
      .order('category')
      .order('meal_name');

    if (btn) setButtonLoading(btn, false);

    if (error) throw new Error(error.message);

    const now = new Date();
    const dateStr = now.toLocaleDateString('zh-TW');
    const timeStr = now.toLocaleTimeString('zh-TW', { hour12: false });

    let text = `【大家政便當廠】${restaurantName} 餐點統計\n`;
    text += `生成時間：${dateStr} ${timeStr}\n`;
    text += `════════════════════\n\n`;

    if (!items || items.length === 0) {
      text += '暫無餐點資料';
    } else {
      let totalCount = 0;
      let currentCategory = '';
      items.forEach(item => {
        if (item.category !== currentCategory) {
          currentCategory = item.category;
          text += `【${currentCategory}】\n`;
        }
        text += `  ${item.meal_name} x${item.order_count}  (${item.price}元)\n`;
        totalCount += Number(item.order_count);
      });
      text += `\n════════════════════\n`;
      text += `總份數：${totalCount} 份\n`;
    }

    await copyToClipboard(text);
    showMessageModal('✅ 成功', `已複製 ${restaurantName} 餐點統計`);

  } catch (error) {
    if (btn) setButtonLoading(btn, false);
    console.error('複製統計失敗:', error);
    showMessageModal('❌ 錯誤', error.message || '產生統計失敗');
  }
}

async function cutOffOrder() {
  const btn = document.querySelector('#page-admin-restaurant .btn-warning');

  // 先查今天的訂餐狀況
  if (btn) setButtonLoading(btn, true);

  let stats = null;
  try {
    const sb = await initSupabase();

    const { data: meals, error } = await sb
      .from('today_meals')
      .select('user_id, amount, price');

    if (error) throw error;

    if (!meals || meals.length === 0) {
      if (btn) setButtonLoading(btn, false);
      showMessageModal('ℹ️ 無訂餐', '今天還沒有人訂餐，不需要截止');
      return;
    }

    // 計算人數與總金額
    const userIds = new Set();
    let totalAmount = 0;
    meals.forEach(m => {
      userIds.add(m.user_id);
      totalAmount += (Number(m.amount) || 0) * (Number(m.price) || 0);
    });

    stats = {
      userCount: userIds.size,
      totalAmount: Math.round(totalAmount * 100) / 100,
      mealCount: meals.length
    };

  } catch (error) {
    if (btn) setButtonLoading(btn, false);
    console.error('查詢訂餐統計失敗:', error);
    showMessageModal('❌ 錯誤', '無法查詢訂餐狀況：' + error.message);
    return;
  }

  if (btn) setButtonLoading(btn, false);

  // 組合確認訊息
  const restaurantName = AppState.currentRestaurantName() || '未知餐廳';
  const confirmMsg =
    `餐廳：${restaurantName}\n` +
    `訂購人數：${stats.userCount} 位\n` +
    `餐點總數：${stats.mealCount} 份\n` +
    `扣款總金額：$${stats.totalAmount}\n\n` +
    `⚠️ 此操作將對所有訂購者扣款，且無法復原。\n\n` +
    `確定要截止訂餐嗎？`;

  showConfirmModal(
    '⚠️ 截止訂餐',
    confirmMsg,
    async function() {
      await executeCutOffOrder();
    }
  );
}

async function executeCutOffOrder() {
  const btn = document.querySelector('#page-admin-restaurant .btn-warning');
  if (btn) setButtonLoading(btn, true);

  const resultDiv = document.getElementById('cutOffResult');
  if (resultDiv) showConanLoading('cutOffResult', 'cutOffOrder');

  try {
    const sb = await initSupabase();
    const { data, error } = await sb.rpc('cut_off_order');

    if (btn) setButtonLoading(btn, false);

    if (error) {
      showMessageModal('❌ 截止失敗', error.message);
      return;
    }

    const result = data;

    if (result.success) {
      let msg = result.message;
      if (result.errors && result.errors.length > 0) {
        msg += `\n\n⚠️ ${result.errors.length} 位使用者扣款失敗：`;
        result.errors.forEach(e => {
          msg += `\n• ${e.user_id} ${e.name}：${e.reason}`;
        });
      }
      showMessageModal('✅ 截止訂餐', msg);

      AppState.setCurrentRestaurantName('');

      if (typeof clearTodayRestaurantCache === 'function') clearTodayRestaurantCache();
      if (typeof clearRestaurantMenuCache === 'function') clearRestaurantMenuCache();

      loadTodayRestaurantStatus();
    } else {
      showMessageModal('❌ 截止失敗', result.message);
    }
  } catch (err) {
    if (btn) setButtonLoading(btn, false);
    console.error('截止訂餐失敗:', err);
    showMessageModal('❌ 截止失敗', err.message || '請稍後再試');
  }
}

window.setEndTimeQuick = setEndTimeQuick;
window.loadTodayRestaurantStatus = loadTodayRestaurantStatus;
window.setTodayRestaurant = setTodayRestaurant;
window.showTodayRestaurantStats = showTodayRestaurantStats;
window.copyRestaurantStatsList = copyRestaurantStatsList;
window.cutOffOrder = cutOffOrder;

console.log('🏪 餐廳模組已載入（Supabase 版 + 原子寫入）');
