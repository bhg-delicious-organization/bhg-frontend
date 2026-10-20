// ==================== query.js ====================
// 使用者查詢模組（自動載入 + 載入更多 + 餘額顯示）
// 依賴：api.js、supabase.js、state.js、ui.js、common.js、core.js
// ====================================================

const TRANSACTIONS_PAGE_SIZE = 5;
let transactionsOffset = 0;
let transactionsHasMore = true;

/**
 * 載入使用者餘額（只查 users 表）
 */
async function loadUserBalance(studentId) {
  if (!studentId) studentId = AppState.currentStudentId();
  if (!studentId) return;

  const balanceDisplay = document.getElementById('balanceDisplay');
  const userNameDisplay = document.getElementById('userNameDisplay');

  const cached = AppState.getUserData(studentId);
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
      .maybeSingle();

    if (error || !userData) {
      if (balanceDisplay) balanceDisplay.textContent = '-';
      if (userNameDisplay) userNameDisplay.textContent = '查無此學號';
      return;
    }

    if (balanceDisplay) balanceDisplay.textContent = `$${userData.balance}`;
    if (userNameDisplay) userNameDisplay.textContent = userData.name || '';

    const cached = AppState.getUserData(studentId) || {};
    AppState.setUserData(studentId, { ...cached, user: userData });

  } catch (error) {
    console.error('載入餘額失敗:', error);
    if (balanceDisplay) balanceDisplay.textContent = '-';
  }
}

/**
 * 載入使用者交易紀錄（第一頁，重置）
 */
async function loadUserTransactions(studentId) {
  if (!studentId) studentId = AppState.currentStudentId();
  if (!studentId) return;

  // 重置分頁狀態
  transactionsOffset = 0;
  transactionsHasMore = true;

  const tbody = document.getElementById('transactionBody');
  if (!tbody) return;

  // 先用快取
  const cached = AppState.getUserData(studentId);
  if (cached?.transactions && cached.transactions.length > 0) {
    tbody.innerHTML = '';
    renderTransactions(cached.transactions, tbody);
    updateLoadMoreButton();
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
      .range(0, TRANSACTIONS_PAGE_SIZE - 1);

    if (error) throw error;

    const list = transactions || [];
    transactionsOffset = list.length;
    transactionsHasMore = list.length === TRANSACTIONS_PAGE_SIZE;

    tbody.innerHTML = '';
    renderTransactions(list, tbody);
    updateLoadMoreButton();

    // 更新快取
    const cached = AppState.getUserData(studentId) || {};
    AppState.setUserData(studentId, { ...cached, transactions: list });

  } catch (error) {
    console.error('載入交易紀錄失敗:', error);
    tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">載入失敗</td></tr>';
    transactionsHasMore = false;
    updateLoadMoreButton();
  }
}

/**
 * 載入更多交易紀錄
 */
async function loadMoreTransactions(event) {
  const btn = event ? event.currentTarget : null;
  const studentId = AppState.currentStudentId();
  if (!studentId) return;

  if (!transactionsHasMore) return;

  if (btn) setButtonLoading(btn, true);

  try {
    const sb = await initSupabase();

    const { data: transactions, error } = await sb
      .from('transactions')
      .select('*')
      .eq('user_id', studentId)
      .order('created_at', { ascending: false })
      .range(transactionsOffset, transactionsOffset + TRANSACTIONS_PAGE_SIZE - 1);

    if (error) throw error;

    const list = transactions || [];
    transactionsOffset += list.length;
    transactionsHasMore = list.length === TRANSACTIONS_PAGE_SIZE;

    const tbody = document.getElementById('transactionBody');
    if (tbody) {
      renderTransactions(list, tbody, true); // append = true
    }

    updateLoadMoreButton();

    if (btn) setButtonLoading(btn, false);

  } catch (error) {
    console.error('載入更多交易失敗:', error);
    if (btn) setButtonLoading(btn, false);
    showMessageModal('❌ 錯誤', '載入更多交易失敗');
  }
}

/**
 * 顯示/隱藏「載入更多」按鈕
 */
function updateLoadMoreButton() {
  const container = document.getElementById('transactionsLoadMore');
  if (!container) return;

  if (transactionsHasMore && transactionsOffset > 0) {
    container.style.display = 'block';
  } else {
    container.style.display = 'none';
  }
}

/**
 * 渲染交易紀錄表格
 * @param {Array} transactions - 交易資料
 * @param {HTMLElement} tbody - 表格 tbody
 * @param {boolean} append - 是否附加（true）或取代（false）
 */
function renderTransactions(transactions, tbody, append = false) {
  if (!append) {
    tbody.innerHTML = '';
  }

  if (!transactions || transactions.length === 0) {
    if (!append) {
      const row = tbody.insertRow();
      const cell = row.insertCell();
      cell.colSpan = 4;
      cell.textContent = '無交易紀錄';
      cell.style.textAlign = 'center';
    }
    return;
  }

  transactions.forEach(t => {
    const row = tbody.insertRow();

    // 1. 日期
    const date = new Date(t.created_at);
    const dateStr = date.toLocaleString('zh-TW', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
    row.insertCell().textContent = dateStr;

    // 2. 類型（有顏色）
    const typeCell = row.insertCell();
    typeCell.textContent = t.type || '--';
    typeCell.style.color = t.type === '支出' ? 'var(--danger)' : 'var(--success)';

    // 3. 品項（store - item）
    const itemParts = [];
    if (t.store) itemParts.push(t.store);
    if (t.item) itemParts.push(t.item);
    const itemStr = itemParts.join(' - ') || '--';
    row.insertCell().textContent = itemStr;

    // 4. 金額 + 餘額（合併顯示）
    const amountCell = row.insertCell();
    const amount = Number(t.amount || 0);
    const balanceAfter = t.balance_after != null ? Number(t.balance_after) : null;

    const amountStr = t.type === '支出' ? `-$${amount}` : `+$${amount}`;
    const amountColor = t.type === '支出' ? 'var(--danger)' : 'var(--success)';

    let innerHtml = `<div style="color: ${amountColor}; font-weight: bold;">${amountStr}</div>`;
    if (balanceAfter !== null) {
      innerHtml += `<div style="font-size: 0.75rem; color: var(--gray);">餘 $${balanceAfter}</div>`;
    }

    amountCell.innerHTML = innerHtml;
  });
}

/**
 * 重新整理餘額與交易
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
 * 手動查詢（保留給「重新整理」按鈕）
 */
async function queryUserInfo(event) {
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
window.loadMoreTransactions = loadMoreTransactions;
window.refreshUserBalance = refreshUserBalance;
window.queryUserInfo = queryUserInfo;

console.log('📊 查詢模組已載入（載入更多版）');
