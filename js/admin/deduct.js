// ==================== deduct.js ====================
// 管理員扣款模組（單筆 + 批量）
// 依賴：api.js、state.js、ui.js、common.js、core.js
// ====================================================

let currentCategoryOrderers = [];
let currentRestaurant = '';

/**
 * 單筆扣款
 */
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
  if (resultDiv) resultDiv.innerHTML = '<div class="loading"><div class="spinner"></div>扣款中...</div>';

  const result = await callAdminApi('deductBalance', {
    userId: studentId,
    amount: parseInt(amount)
  });

  if (btn) setButtonLoading(btn, false);

  if (result.success) {
    if (resultDiv) {
      resultDiv.innerHTML = `<div class="message success"><i class="fas fa-check-circle"></i> ${escapeHtml(result.message)}</div>`;
    }
    document.getElementById('deductStudentId').value = '';
    document.getElementById('deductAmount').value = '';
  } else {
    if (resultDiv) {
      resultDiv.innerHTML = `<div class="message error"><i class="fas fa-exclamation-circle"></i> ${escapeHtml(result.message)}</div>`;
    }
  }
}

/**
 * 載入批量扣款資料（今日餐廳 + 分類）
 */
async function loadBatchDeductData() {
  const restaurantSpan = document.getElementById('batchRestaurantName');
  const categorySelect = document.getElementById('batchCategorySelect');

  if (!restaurantSpan || !categorySelect) return;

  restaurantSpan.innerHTML = '<span style="color: var(--gray);">載入中...</span>';
  categorySelect.innerHTML = '<option value="">載入中...</option>';

  const result = await callAdminApi('getTodayRestaurant', {});

  if (result.success && result.restaurant) {
    currentRestaurant = result.restaurant;
    restaurantSpan.innerHTML = `<strong>${escapeHtml(result.restaurant)}</strong>`;
    loadCategoriesForRestaurant(result.restaurant);
  } else {
    restaurantSpan.innerHTML = '<span style="color: var(--danger);">未設定</span>';
    categorySelect.innerHTML = '<option value="">請先設定今日餐廳</option>';
    currentRestaurant = '';
  }
}

/**
 * 載入餐廳分類
 */
async function loadCategoriesForRestaurant(restaurantName) {
  const categorySelect = document.getElementById('batchCategorySelect');
  if (!categorySelect) return;

  categorySelect.innerHTML = '<option value="">載入中...</option>';

  const result = await callAdminApi('getRestaurantCategories', {
    restaurantName: restaurantName
  });

  if (result.success && result.categories) {
    categorySelect.innerHTML = '<option value="">請選擇分類</option>';
    result.categories.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat.name;
      option.textContent = cat.name;
      categorySelect.appendChild(option);
    });
  } else {
    categorySelect.innerHTML = '<option value="">無分類資料</option>';
  }
}

/**
 * 顯示分類的訂購者清單
 */
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

  container.innerHTML = '<div class="loading"><div class="spinner" style="width: 20px; height: 20px;"></div>載入中...</div>';

  const result = await callAdminApi('getCategoryOrderers', {
    restaurantName: currentRestaurant,
    categoryName: category
  });

  if (result.success) {
    currentCategoryOrderers = result.users;
    if (result.users.length > 0) {
      let html = '<strong>📋 訂購者清單：</strong><ul style="margin-top: 8px;">';
      result.users.forEach(user => {
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
      html += `</ul><div style="color: var(--gray); font-size: 0.85rem;">共 ${result.count} 位使用者</div>`;
      container.innerHTML = html;
    } else {
      container.innerHTML = '<p style="color: var(--gray);">尚無訂購者</p>';
      currentCategoryOrderers = [];
    }
  } else {
    container.innerHTML = '<p class="message error">載入失敗</p>';
  }
}

/**
 * 確認批量扣款
 */
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

/**
 * 執行批量扣款
 */
async function executeBatchDeductByCategory(restaurant, category, amount) {
  const resultDiv = document.getElementById('batchDeductResult');
  const btn = document.querySelector('#page-admin-batch-deduct .btn-warning');

  if (btn) setButtonLoading(btn, true);
  if (resultDiv) resultDiv.innerHTML = '<div class="loading"><div class="spinner"></div>批量扣款中...</div>';

  const result = await callAdminApi('batchDeductByCategory', {
    restaurantName: restaurant,
    categoryName: category,
    amountPerItem: parseFloat(amount)
  });

  if (btn) setButtonLoading(btn, false);

  if (result.success) {
    let html = `<div class="message success">
      <i class="fas fa-check-circle"></i> ${escapeHtml(result.message)}<br>
      影響人數：${result.count} 人<br>
      總扣款金額：$${result.totalDeducted}
    </div>`;

    if (result.results) {
      const failed = result.results.filter(r => !r.success);
      if (failed.length > 0) {
        html += `<div class="message warning" style="margin-top: 10px;">
          <strong>⚠️ 以下使用者餘額不足，未扣款：</strong><ul>`;
        failed.forEach(f => {
          html += `<li>${escapeHtml(f.userId)} ${escapeHtml(f.name)} - 需扣 ${f.deductAmount} 元，餘額 ${f.oldBalance} 元</li>`;
        });
        html += `</ul></div>`;
      }
    }

    if (resultDiv) resultDiv.innerHTML = html;
    document.getElementById('batchDeductAmount').value = '';
    showCategoryOrderers();
  } else {
    if (resultDiv) resultDiv.innerHTML = `<div class="message error">❌ ${escapeHtml(result.message)}</div>`;
  }
}

window.deductBalance = deductBalance;
window.loadBatchDeductData = loadBatchDeductData;
window.showCategoryOrderers = showCategoryOrderers;
window.confirmBatchDeductByCategory = confirmBatchDeductByCategory;

console.log('💰 扣款模組已載入');
