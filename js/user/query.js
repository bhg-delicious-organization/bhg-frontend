// ==================== query.js ====================
// 使用者查詢模組
// 依賴：api.js、supabase.js、state.js、ui.js、common.js、core.js
// ====================================================

/**
 * 查詢使用者餘額與交易紀錄
 * @param {boolean} [skipRecord=false] - 是否跳過記錄學號
 * @param {Event} [event] - 按鈕點擊事件
 */
async function queryUserInfo(skipRecord = false, event) {
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

  if (!/^\d{6}$/.test(studentId)) {
    showMessageModal('❌ 輸入錯誤', '學號必須為 6 位數字');
    return;
  }

  // 顯示載入狀態
  if (btn) {
    setButtonLoading(btn, true);
  }

  // 顯示柯南載入動畫
  showConanLoading('balanceDisplay', 'getUserBalance');

  // 記錄最近學號
  if (!skipRecord && studentId !== AppState.rememberedStudentId()) {
    AppState.setRememberedStudentId(studentId);
    fillAllStudentIdInputs(studentId);
  }

  try {
    const sb = await initSupabase();

    // ========== 查詢餘額 ==========
    const { data: userData, error: userError } = await sb
      .from('users')
      .select('balance, name')
      .eq('user_id', studentId)
      .single();

    if (btn) {
      setButtonLoading(btn, false);
    }

    const balanceDisplay = document.getElementById('balanceDisplay');
    const userNameDisplay = document.getElementById('userNameDisplay');

    if (userError || !userData) {
      if (balanceDisplay) balanceDisplay.textContent = '-';
      if (userNameDisplay) userNameDisplay.textContent = '查無此學號';
      return;
    }

    if (balanceDisplay) balanceDisplay.textContent = `$${userData.balance}`;
    if (userNameDisplay) userNameDisplay.textContent = userData.name || '';

    // ========== 載入交易紀錄 ==========
    const { data: transactions, error: transError } = await sb
      .from('transactions')
      .select('*')
      .eq('user_id', studentId)
      .order('created_at', { ascending: false })
      .limit(5);

    const tbody = document.getElementById('transactionBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (!transError && transactions && transactions.length > 0) {
      transactions.forEach(t => {
        const row = tbody.insertRow();

        // 日期
        const date = new Date(t.created_at);
        const dateStr = date.toLocaleString('zh-TW', {
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });
        row.insertCell().textContent = dateStr;

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

  } catch (error) {
    if (btn) {
      setButtonLoading(btn, false);
    }
    console.error('查詢失敗:', error);
    showMessageModal('❌ 錯誤', error.message || '查詢失敗');
  }
}

// 掛載到 window
window.queryUserInfo = queryUserInfo;

console.log('📊 查詢模組已載入');
