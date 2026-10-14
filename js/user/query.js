// ==================== query.js ====================
// 使用者查詢模組（自動載入 + 手動重新整理）
// 依賴：api.js、supabase.js、state.js、ui.js、common.js、core.js
// ==================================================

/**
 * 載入使用者餘額（只查 users 表）
 * 優先使用快取，背景重查
 */
async function loadUserBalance(studentId) {
  if (!studentId) studentId = AppState.currentStudentId();
  if (!studentId) return;

  const balanceDisplay = document.getElementById('balanceDisplay');
  const userNameDisplay = document.getElementById('userNameDisplay');

  // 先用快取
  const cached = AppState.getUserData();
  if (cached?.user) {
    if (balanceDisplay) balanceDisplay.textContent = `$${cached.user.balance}`;
    if (userNameDisplay) userNameDisplay.textContent = cached.user.name || '';
  } else {
    if (balanceDisplay) showConanLoading('balanceDisplay', 'getUserBalance');
  }

  try {
    const sb = await initSupabase();

    const { data: userData, error } = await sb
      .from('users')
      .select('balance, name')
      .eq('user_id', studentId)
      .single();

    if (error || !userData) {
      if (balanceDisplay) balanceDisplay.textContent = '-';
      if (userNameDisplay) userNameDisplay.textContent = '查無此學號';
      return;
    }

    if (balanceDisplay) balanceDisplay.textContent = `$${userData.balance}`;
    if (userNameDisplay) userNameDisplay.textContent = userData.name || '';

    // 更新快取
    const cached = AppState.getUserData() || {};
    AppState.setUserData({ ...cached, user: userData });

  } catch (error) {
    console.error('載入餘額失敗:', error);
    if (balanceDisplay) balanceDisplay.textContent = '-';
  }
}

/**
 * 載入使用者交易紀錄（只查 transactions 表）
 */
async function loadUserTransactions(studentId) {
  if (!studentId) studentId = AppState.currentStudentId();
  if (!studentId) return;

  const tbody = document.getElementById('transactionBody');
  if (!tbody) return;

  // 先用快取
  const cached = AppState.getUserData();
  if (cached?.transactions && cached.transactions.length > 0) {
    renderTransactions(cached.transactions, tbody);
  } else {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">載入中...</td></tr>';
  }

  try {
    const sb = await initSupabase();

    const { data: transactions, error } = await sb
      .from('transactions')
      .select('*')
      .eq('user_id', studentId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) throw error;

    renderTransactions(transactions || [], tbody);

    // 更新快取
    const cached = AppState.getUserData() || {};
    AppState.setUserData({ ...cached, transactions: transactions || [] });

  } catch (error) {
    console.error('載入交易紀錄失敗:', error);
    tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">載入失敗</td></tr>';
  }
}

/**
 * 渲染交易紀錄表格
 */
function renderTransactions(transactions, tbody) {
  tbody.innerHTML = '';

  if (!transactions || transactions.length === 0) {
    const row = tbody.insertRow();
    const cell = row.insertCell();
    cell.colSpan = 4;
    cell.textContent = '無交易紀錄';
    cell.style.textAlign = 'center';
    return;
  }

  transactions.forEach(t => {
    const row = tbody.insertRow();

    const date = new Date(t.created_at);
    const dateStr = date.toLocaleString('zh-TW', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
    row.insertCell().textContent = dateStr;

    const typeCell = row.insertCell();
    typeCell.textContent = t.type || '--';
    typeCell.style.color = t.type === '支出' ? 'var(--danger)' : 'var(--success)';

    row.insertCell().textContent = t.item || '--';

    const amountCell = row.insertCell();
    amountCell.textContent = t.type === '支出' ? `-$${t.amount}` : `$${t.amount}`;
    amountCell.style.color = t.type === '支出' ? 'var(--danger)' : 'var(--success)';
  });
}

/**
 * 重新整理餘額與交易（背景呼叫）
 */
async function refreshUserBalance() {
  const studentId = AppState.currentStudentId();
  if (!studentId) return;

  await Promise.all([
    loadUserBalance(studentId),
    loadUserTransactions(studentId)
  ]);
}

/**
 * 手動查詢（保留給「重新整理」按鈕用）
 */
async function queryUserInfo(skipRecord = false, event) {
  const studentId = AppState.currentStudentId();
  if (!studentId) {
    showMessageModal('❌ 錯誤', '請重新登入');
    return;
  }

  let btn = null;
  if (event && event.currentTarget) {
    btn = event.currentTarget;
  } else {
    btn = document.querySelector('#page-user-query .btn-primary');
  }

  if (btn) setButtonLoading(btn, true);

  try {
    await refreshUserBalance();
  } finally {
    if (btn) setButtonLoading(btn, false);
  }
}

window.loadUserBalance = loadUserBalance;
window.loadUserTransactions = loadUserTransactions;
window.refreshUserBalance = refreshUserBalance;
window.queryUserInfo = queryUserInfo;

console.log('📊 查詢模組已載入（自動載入版）');
