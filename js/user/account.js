// ==================== account.js ====================
// 使用者帳號管理模組（Supabase 版）
// 依賴：supabase.js、state.js、ui.js、common.js、core.js
// ====================================================

async function loadAccountPage() {
  const studentId = AppState.currentStudentId();
  const notLoggedInDiv = document.getElementById('accountNotLoggedIn');
  const loggedInDiv = document.getElementById('accountLoggedIn');

  if (!notLoggedInDiv || !loggedInDiv) return;

  if (!studentId) {
    notLoggedInDiv.style.display = 'block';
    loggedInDiv.style.display = 'none';

    const input = document.getElementById('accountLoginStudentId');
    const errorDiv = document.getElementById('accountLoginError');
    if (input) input.value = '';
    if (errorDiv) errorDiv.innerHTML = '';
  } else {
    notLoggedInDiv.style.display = 'none';
    loggedInDiv.style.display = 'block';

    const studentIdEl = document.getElementById('accountStudentId');
    if (studentIdEl) studentIdEl.textContent = studentId;

    showConanLoading('accountUserName', 'getUserBalance');

    try {
      const sb = await initSupabase();

      // 1. 查姓名與餘額
      const { data: userData, error: userError } = await sb
        .from('users')
        .select('name, balance')
        .eq('user_id', studentId)
        .single();

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
}

async function loginFromAccount() {
  const studentId = document.getElementById('accountLoginStudentId').value.trim();
  const password = document.getElementById('accountLoginPassword').value;
  const errorDiv = document.getElementById('accountLoginError');

  if (!studentId || !/^\d{6}$/.test(studentId)) {
    if (errorDiv) errorDiv.innerHTML = '<div class="message error">請輸入6位數學號</div>';
    return;
  }

  if (errorDiv) {
    showConanLoading('accountLoginError', 'verifyUserPassword');
  }

  try {
    const sb = await initSupabase();
    const email = `${studentId}@bhg.local`;

    const { data, error } = await sb.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (error) {
      if (errorDiv) {
        errorDiv.innerHTML = `<div class="message error">學號或密碼錯誤</div>`;
      }
      return;
    }

    if (errorDiv) errorDiv.innerHTML = '';

    AppState.setCurrentStudentId(studentId);
    fillAllStudentIdInputs(studentId, true);
    loadAccountPage();

  } catch (error) {
    if (errorDiv) {
      errorDiv.innerHTML = `<div class="message error">${escapeHtml(error.message)}</div>`;
    }
  }
}

async function logoutFromAccount() {
  try {
    const sb = await initSupabase();
    await sb.auth.signOut();
  } catch (e) {
    console.warn('登出失敗:', e);
  }

  AppState.setCurrentStudentId('');

  const inputs = ['queryStudentId', 'deductStudentId', 'statsStudentId', 'mealStudentId', 'directRechargeUserId'];
  inputs.forEach(id => {
    const input = document.getElementById(id);
    if (input) input.value = '';
  });

  showMessageModal('✅ 已登出', '您已成功登出');
  loadAccountPage();
}

window.loadAccountPage = loadAccountPage;
window.loginFromAccount = loginFromAccount;
window.logoutFromAccount = logoutFromAccount;

console.log('👤 帳號模組已載入（Supabase 版）');
