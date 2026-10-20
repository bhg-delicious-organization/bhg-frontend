// ==================== deduct.js ====================
// 管理員扣款模組（單筆 + 批量）（Supabase 版）
// 依賴：supabase.js、state.js、ui.js、common.js、core.js
// ==================================================

let currentCategoryOrderers = [];
let currentRestaurant = '';

async function deductBalance(event) {
  const btn = event ? event.currentTarget : null;

  const studentId = document.getElementById('deductStudentId').value.trim();
  const amount = document.getElementById('deductAmount').value;

  if (!studentId || !amount || amount <= 0) {
    showMessageModal('❌ 輸入錯誤', '請輸入有效的學號和金額');
    return;
  }

  if (!/^\d{6}$/.test(studentId)) {
    showMessageModal('❌ 輸入錯誤', '學號必須為6位數字');
    return;
  }

  if (btn) setButtonLoading(btn, true);

  const resultDiv = document.getElementById('deductResult');
  if (resultDiv) showConanLoading('deductResult', 'deductBalance');

  try {
    const sb = await initSupabase();

    const { data, error } = await sb.rpc('admin_deduct', {
      p_user_id: studentId,
      p_amount: parseFloat(amount)
    });

    if (btn) setButtonLoading(btn, false);

    if (error) {
      if (resultDiv) resultDiv.innerHTML = `<div class="message error">❌ ${escapeHtml(error.message)}</div>`;
      return;
    }

    assertRpcSuccess(data, 'admin_deduct');

    if (resultDiv) {
      resultDiv.innerHTML = `<div class="message success"><i class="fas fa-check-circle"></i> ${escapeHtml(data.message)}</div>`;
    }
    document.getElementById('deductStudentId').value = '';
    document.getElementById('deductAmount').value = '';
  } catch (error) {
    if (btn) setButtonLoading(btn, false);
    if (resultDiv) resultDiv.innerHTML = `<div class="message error">❌ ${escapeHtml(error.message)}</div>`;
  }
}

async function loadBatchDeductData() {
  const restaurantSpan = document.getElementById('batchRestaurantName');
  const categorySelect = document.getElementById('batchCategorySelect');

  if (!restaurantSpan || !categorySelect) return;

  restaurantSpan.innerHTML = '<span style="color: var(--gray);">載入中...</span>';
  categorySelect.innerHTML = '<option value="">載入中...</option>';

  try {
    const sb = await initSupabase();

    const { data: setting } = await sb
      .from('system_settings')
      .select('value')
      .eq('key', 'today_restaurant')
      .single();

    const restaurantName = setting?.value || '';

    if (restaurantName) {
      currentRestaurant = restaurantName;
      restaurantSpan.innerHTML = `<strong>${escapeHtml(restaurantName)}</strong>`;
      loadCategoriesForRestaurant(restaurantName);
    } else {
      restaurantSpan.innerHTML = '<span style="color: var(--danger);">未設定</span>';
      categorySelect.innerHTML = '<option value="">請先設定今日餐廳</option>';
      currentRestaurant = '';
    }
  } catch (error) {
    console.error('載入批量扣款資料失敗:', error);
    restaurantSpan.innerHTML = '<span style="color: var(--danger);">載入失敗</span>';
    categorySelect.innerHTML = '<option value="">載入失敗</option>';
  }
}

async function loadCategoriesForRestaurant(restaurantName) {
  const categorySelect = document.getElementById('batchCategorySelect');
  if (!categorySelect) return;

  categorySelect.innerHTML = '<option value="">載入中...</option>';

  try {
    const sb = await initSupabase();

    const { data: restData } = await sb
      .from('restaurants')
      .select('id')
      .eq('name', restaurantName)
      .single();

    if (!restData) {
      categorySelect.innerHTML = '<option value="">無分類資料</option>';
      return;
    }

    const { data: items, error } = await sb
      .from('menu_items')
      .select('category')
      .eq('restaurant_id', restData.id);

    if (error || !items) {
      categorySelect.innerHTML = '<option value="">無分類資料</option>';
      return;
    }

    const categories = [...new Set(items.map(i => i.category))].sort();

    categorySelect.innerHTML = '<option value="">請選擇分類</option>';
    categories.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat;
      option.textContent = cat;
      categorySelect.appendChild(option);
    });
  } catch (error) {
    console.error('載入分類失敗:', error);
    categorySelect.innerHTML = '<option value="">載入失敗</option>';
  }
}

async function showCategoryOrderers() {
  const categorySelect = document.getElementById('batchCategorySelect');
  const category = categorySelect ? categorySelect.value : '';

  const container = document.getElementById('batchOrderersList');
  if (!container) return;

  if (!currentRestaurant || !category) {
    container.innerHTML = '';
    currentCategoryOrderers = [];
    return;
  }

  showConanLoading('batchOrderersList', 'getCategoryOrderers');

  try {
    const sb = await initSupabase();

    const { data: meals, error } = await sb
      .from('today_meals')
      .select('user_id, meal_name, amount, category')
      .eq('category', category);

    if (error || !meals || meals.length === 0) {
      container.innerHTML = '<p style="color: var(--gray);">尚無訂購者</p>';
      currentCategoryOrderers = [];
      return;
    }

    const userMap = {};
    meals.forEach(m => {
      if (!userMap[m.user_id]) {
        userMap[m.user_id] = { userId: m.user_id, meals: [], totalAmount: 0 };
      }
      userMap[m.user_id].meals.push({ name: m.meal_name, amount: Number(m.amount) });
      userMap[m.user_id].totalAmount += Number(m.amount);
    });

    const userIds = Object.keys(userMap);
    const { data: users } = await sb
      .from('users')
      .select('user_id, name')
      .in('user_id', userIds);

    const nameMap = {};
    (users || []).forEach(u => { nameMap[u.user_id] = u.name; });

    const orderers = userIds.map(uid => ({
      userId: uid,
      name: nameMap[uid] || '未知',
      totalAmount: userMap[uid].totalAmount,
      meals: userMap[uid].meals
    }));

    currentCategoryOrderers = orderers;

    if (orderers.length > 0) {
      let html = '<strong>📋 訂購者清單：</strong><ul style="margin-top: 8px;">';
      orderers.forEach(user => {
        html += `<li>${escapeHtml(user.userId)} ${escapeHtml(user.name)} - 共 ${user.totalAmount} 份`;
        if (user.meals.length > 0) {
          html += ' (';
          user.meals.forEach((meal, idx) => {
            if (idx > 0) html += ', ';
            html += `${escapeHtml(meal.name)} x${meal.amount}`;
          });
          html += ')';
        }
        html += `</li>`;
      });
      html += `</ul><div style="color: var(--gray); font-size: 0.85rem;">共 ${orderers.length} 位使用者</div>`;
      container.innerHTML = html;
    } else {
      container.innerHTML = '<p style="color: var(--gray);">尚無訂購者</p>';
    }
  } catch (error) {
    console.error('載入訂購者失敗:', error);
    container.innerHTML = '<p class="message error">載入失敗</p>';
  }
}

function confirmBatchDeductByCategory() {
  const restaurantSpan = document.getElementById('batchRestaurantName');
  const categorySelect = document.getElementById('batchCategorySelect');
  const amountInput = document.getElementById('batchDeductAmount');

  const restaurantName = restaurantSpan ? restaurantSpan.innerText.trim() : '';
  const category = categorySelect ? categorySelect.value : '';
  const amount = amountInput ? amountInput.value : '';

  if (!restaurantName || !category || !amount || amount <= 0) {
    showMessageModal('❌ 輸入錯誤', '請選擇分類並輸入扣款金額');
    return;
  }

  if (currentCategoryOrderers.length === 0) {
    showMessageModal('❌ 無法扣款', '此分類尚無訂購者');
    return;
  }

  showConfirmModal(
    '⚠️ 批量扣款',
    `今日餐廳：${restaurantName}\n分類：${category}\n每個餐點扣款：${amount} 元\n\n` +
    `確定要對所有點此分類的使用者扣款嗎？\n\n` +
    `共 ${currentCategoryOrderers.length} 位使用者會受到影響。`,
    function() {
      executeBatchDeductByCategory(restaurantName, category, amount);
    }
  );
}

async function executeBatchDeductByCategory(restaurant, category, amount) {
  const resultDiv = document.getElementById('batchDeductResult');
  const btn = document.querySelector('#page-admin-batch-deduct .btn-warning');

  if (btn) setButtonLoading(btn, true);
  if (resultDiv) showConanLoading('batchDeductResult', 'batchDeductByCategory');

  try {
    const sb = await initSupabase();

    const { data, error } = await sb.rpc('batch_deduct_by_category', {
      p_restaurant: restaurant,
      p_category: category,
      p_amount_per_item: parseFloat(amount)
    });

    if (btn) setButtonLoading(btn, false);

    if (error) {
      if (resultDiv) resultDiv.innerHTML = `<div class="message error">❌ ${escapeHtml(error.message)}</div>`;
      return;
    }

    assertRpcSuccess(data, 'batch_deduct_by_category');

    let html = `<div class="message success">
      <i class="fas fa-check-circle"></i> ${escapeHtml(data.message)}<br>
      影響人數：${data.count} 人<br>
      總扣款金額：$${data.totalDeducted}
    </div>`;

    const failed = (data.results || []).filter(r => !r.success);
    if (failed.length > 0) {
      html += `<div class="message warning" style="margin-top: 10px;">
        <strong>⚠️ 以下使用者餘額不足，未扣款：</strong><ul>`;
      failed.forEach(f => {
        html += `<li>${escapeHtml(f.userId)} ${escapeHtml(f.name)} - 需扣 ${f.deductAmount} 元，餘額 ${f.oldBalance} 元</li>`;
      });
      html += `</ul></div>`;
    }

    if (resultDiv) resultDiv.innerHTML = html;
    document.getElementById('batchDeductAmount').value = '';
    showCategoryOrderers();
  } catch (error) {
    if (btn) setButtonLoading(btn, false);
    console.error('批量扣款失敗:', error);
    if (resultDiv) resultDiv.innerHTML = `<div class="message error">❌ ${escapeHtml(error.message)}</div>`;
  }
}

window.deductBalance = deductBalance;
window.loadBatchDeductData = loadBatchDeductData;
window.showCategoryOrderers = showCategoryOrderers;
window.confirmBatchDeductByCategory = confirmBatchDeductByCategory;

console.log('💰 扣款模組已載入（Supabase 版）');
