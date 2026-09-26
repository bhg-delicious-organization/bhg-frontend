// ==================== query.js ====================
// 使用者查詢模組
// 依賴：api.js、state.js、ui.js、common.js、core.js
// ====================================================

/**
 * 查詢使用者餘額與交易紀錄
 * @param {boolean} [skipRecord=false] - 是否跳過記錄學號
 * @param {Event} [event] - 按鈕點擊事件
 */
async function queryUserInfo(skipRecord = false, event) {
  // 取得按鈕元素
  let btn = null;
  if (event && event.currentTarget) {
    btn = event.currentTarget;
  } else {
    btn = document.querySelector('#page-user-query .btn-primary');
  }

  const inputElement = document.getElementById('queryStudentId');

  if (!inputElement) {
    showMessageModal('❌ 錯誤', '頁面元素錯誤');
    return;
  }

  const studentId = inputElement.value.trim();

  if (!studentId) {
    showMessageModal('❌ 輸入錯誤', '請輸入學號');
    return;
  }

  // 顯示載入狀態
  if (btn) {
    setButtonLoading(btn, true);
  }

  // 記錄最近學號
  if (!skipRecord && studentId !== AppState.rememberedStudentId()) {
    AppState.setRememberedStudentId(studentId);
    fillAllStudentIdInputs(studentId);
  }

  // ========== 查詢餘額 ==========
  const balanceResult = await callApi('getUserBalance', { userId: studentId });

  if (btn) {
    setButtonLoading(btn, false);
  }

  const balanceDisplay = document.getElementById('balanceDisplay');
  const userNameDisplay = document.getElementById('userNameDisplay');

  if (balanceResult.success) {
    if (balanceDisplay) balanceDisplay.textContent = `$${balanceResult.balance}`;
    if (userNameDisplay) userNameDisplay.textContent = balanceResult.name || '';
  } else {
    if (balanceDisplay) balanceDisplay.textContent = '-';
    if (userNameDisplay) userNameDisplay.textContent = '';
    if (balanceResult.message) {
      showMessageModal('查詢結果', balanceResult.message);
    }
  }

  // ========== 載入交易紀錄 ==========
  const transResult = await callApi('getTransactionHistory', { userId: studentId });

  const tbody = document.getElementById('transactionBody');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (transResult.success && transResult.transactions && transResult.transactions.length > 0) {
    transResult.transactions.forEach(t => {
      const row = tbody.insertRow();

      // 日期（只取 MM/DD）
      const dateParts = (t.date || '--').split('/');
      const dateDisplay = dateParts.length >= 3 ?
        `${dateParts[1]}/${dateParts[2].split(' ')[0]}` :
        (t.date || '--');
      row.insertCell().textContent = dateDisplay;

      // 類型
      const typeCell = row.insertCell();
      typeCell.textContent = t.type || '--';
      typeCell.style.color = t.type === '支出' ? 'var(--danger)' : 'var(--success)';

      // 品項
      row.insertCell().textContent = t.item || '--';

      // 金額
      const amountCell = row.insertCell();
      amountCell.textContent = t.type === '支出' ? `-$${t.amount}` : `$${t.amount}`;
      amountCell.style.color = t.type === '支出' ? 'var(--danger)' : 'var(--success)';
    });
  } else {
    const row = tbody.insertRow();
    const cell = row.insertCell();
    cell.colSpan = 4;
    cell.textContent = '無交易紀錄';
    cell.style.textAlign = 'center';
  }
}

// 掛載到 window
window.queryUserInfo = queryUserInfo;

console.log('📊 查詢模組已載入');
