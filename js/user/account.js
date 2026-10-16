// ==================== account.js ====================
// 使用者帳號管理模組（Supabase 版 + session 為準）
// 依賴：supabase.js、state.js、ui.js、common.js、core.js
// ====================================================

async function loadAccountPage() {
  const studentId = AppState.currentStudentId();
  const loggedInDiv = document.getElementById('accountLoggedIn');

  if (!loggedInDiv) return;

  if (!studentId) {
    navigateTo('user-register');
    return;
  }

  const studentIdEl = document.getElementById('accountStudentId');
  if (studentIdEl) studentIdEl.textContent = studentId;

  // 先用快取
  const cached = AppState.getUserData();
  if (cached?.user) {
    const userNameEl = document.getElementById('accountUserName');
    if (userNameEl) userNameEl.textContent = cached.user.name || '未知';
  } else {
    showConanLoading('accountUserName', 'getUserBalance');
  }

  try {
    const sb = await initSupabase();

    // 1. 查姓名與餘額
    const { data: userData, error: userError } = await sb
      .from('users')
      .select('name, balance')
      .eq('user_id', studentId)
      .maybeSingle();

    const userNameEl = document.getElementById('accountUserName');
    if (userError || !userData) {
      if (userNameEl) userNameEl.textContent = '查無資料';
    } else {
      if (userNameEl) userNameEl.textContent = userData.name;
    }

    // 2. 查總消費
    const { data: transactions, error: transError } = await sb
      .from('transactions')
      .select('amount')
      .eq('user_id', studentId)
      .eq('type', '支出');

    const totalSpentEl = document.getElementById('accountTotalSpent');
    if (transError || !transactions) {
      if (totalSpentEl) totalSpentEl.textContent = '計算失敗';
    } else {
      const total = transactions.reduce((sum, t) => sum + Number(t.amount || 0), 0);
      if (totalSpentEl) totalSpentEl.textContent = `$${total}`;
    }
  } catch (error) {
    console.error('載入帳號頁失敗:', error);
    const userNameEl = document.getElementById('accountUserName');
    if (userNameEl) userNameEl.textContent = '載入失敗';
  }
}

async function logoutFromAccount() {
  try {
    const sb = await initSupabase();
    await sb.auth.signOut();
  } catch (e) {
    console.warn('登出失敗:', e);
  }

  AppState.logout();

  showMessageModal('✅ 已登出', '您已成功登出');
  navigateTo('user-register');
}

window.loadAccountPage = loadAccountPage;
window.logoutFromAccount = logoutFromAccount;

console.log('👤 帳號模組已載入（Supabase 版）');
