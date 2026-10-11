// ==================== analytics.js ====================
// 管理員統計分析模組（Supabase 版）
// 依賴：supabase.js、state.js、ui.js、common.js、core.js
// ====================================================

function loadAdminAnalytics() {
  loadBasicStats();
  loadSpendingRanking();
  loadTransactionTrend();
}

async function loadBasicStats() {
  const container = document.getElementById('basicStats');
  if (!container) return;
  showConanLoading('basicStats', 'getBasicStats');

  try {
    const sb = await initSupabase();

    // 1. users
    const { data: users, error: uErr } = await sb
      .from('users')
      .select('user_id, balance');

    if (uErr) throw new Error(uErr.message);

    const totalUsers = users.length;
    const totalBalance = users.reduce((s, u) => s + Number(u.balance || 0), 0);
    const averageBalance = totalUsers > 0 ? totalBalance / totalUsers : 0;

    // 2. transactions
    const { data: transactions, error: tErr } = await sb
      .from('transactions')
      .select('type, amount');

    if (tErr) throw new Error(tErr.message);

    let totalRecharge = 0;
    let totalExpense = 0;
    transactions.forEach(t => {
      if (t.type === '儲值') totalRecharge += Number(t.amount || 0);
      else if (t.type === '支出') totalExpense += Number(t.amount || 0);
    });

    container.innerHTML = `
      <div class="stat-card">
        <div class="stat-icon">👥</div>
        <div class="stat-value">${totalUsers}</div>
        <div class="stat-label">總使用者</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">💰</div>
        <div class="stat-value">$${Math.round(totalRecharge * 100) / 100}</div>
        <div class="stat-label">總儲值</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">💸</div>
        <div class="stat-value">$${Math.round(totalExpense * 100) / 100}</div>
        <div class="stat-label">總消費</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📊</div>
        <div class="stat-value">$${Math.round(totalBalance * 100) / 100}</div>
        <div class="stat-label">系統總餘額</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📈</div>
        <div class="stat-value">$${Math.round(averageBalance * 100) / 100}</div>
        <div class="stat-label">平均餘額</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">💳</div>
        <div class="stat-value">${transactions.length}</div>
        <div class="stat-label">總交易筆數</div>
      </div>
    `;
  } catch (error) {
    console.error('載入基本統計失敗:', error);
    if (container) container.innerHTML = `<div class="message error">❌ ${escapeHtml(error.message)}</div>`;
  }
}

async function loadSpendingRanking() {
  const container = document.getElementById('spendingRanking');
  if (!container) return;
  showConanLoading('spendingRanking', 'getSpendingRanking');

  try {
    const sb = await initSupabase();

    // 1. 查所有支出交易
    const { data: transactions, error: tErr } = await sb
      .from('transactions')
      .select('user_id, amount')
      .eq('type', '支出');

    if (tErr) throw new Error(tErr.message);

    // 2. 按 user_id 分組
    const spendMap = {};
    transactions.forEach(t => {
      if (!spendMap[t.user_id]) {
        spendMap[t.user_id] = { total: 0, count: 0 };
      }
      spendMap[t.user_id].total += Number(t.amount || 0);
      spendMap[t.user_id].count++;
    });

    // 3. 查姓名
    const userIds = Object.keys(spendMap);
    if (userIds.length === 0) {
      container.innerHTML = '<div class="message info">暫無消費紀錄</div>';
      return;
    }

    const { data: users } = await sb
      .from('users')
      .select('user_id, name')
      .in('user_id', userIds);

    const nameMap = {};
    (users || []).forEach(u => { nameMap[u.user_id] = u.name; });

    // 4. 排序
    const ranking = userIds.map(uid => ({
      userId: uid,
      name: nameMap[uid] || '未知',
      totalSpent: Math.round(spendMap[uid].total * 100) / 100,
      transactionCount: spendMap[uid].count
    })).sort((a, b) => b.totalSpent - a.totalSpent);

    const top10 = ranking.slice(0, 10);

    let html = `
      <div class="table-container">
        <table class="table">
          <thead>
            <tr>
              <th>排名</th>
              <th>學號</th>
              <th>姓名</th>
              <th>消費總額</th>
              <th>交易次數</th>
            </tr>
          </thead>
          <tbody>
    `;

    top10.forEach((user, index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}`;
      html += `
        <tr>
          <td>${medal}</td>
          <td>${escapeHtml(user.userId)}</td>
          <td>${escapeHtml(user.name)}</td>
          <td class="balance-positive">$${user.totalSpent}</td>
          <td>${user.transactionCount} 次</td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
      </div>
      <p style="margin-top: 10px; color: var(--gray);">共 ${ranking.length} 位使用者有消費紀錄</p>
    `;

    container.innerHTML = html;

  } catch (error) {
    console.error('載入消費排行失敗:', error);
    if (container) container.innerHTML = `<div class="message error">❌ ${escapeHtml(error.message)}</div>`;
  }
}

async function loadTransactionTrend() {
  const container = document.getElementById('trendChart');
  if (!container) return;
  showConanLoading('trendChart', 'getTransactionTrend');

  try {
    const sb = await initSupabase();

    const days = 30;
    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    const { data: transactions, error } = await sb
      .from('transactions')
      .select('type, amount, created_at')
      .gte('created_at', since.toISOString());

    if (error) throw new Error(error.message);

    // 初始化 30 天
    const trend = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const key = formatDateKey(d);
      trend[key] = { date: key, recharge: 0, expense: 0, count: 0 };
    }

    // 統計
    (transactions || []).forEach(t => {
      const d = new Date(t.created_at);
      const key = formatDateKey(d);
      if (trend[key]) {
        trend[key].count++;
        if (t.type === '儲值') trend[key].recharge += Number(t.amount || 0);
        else if (t.type === '支出') trend[key].expense += Number(t.amount || 0);
      }
    });

    const result = Object.values(trend);

    // 找最大值
    let maxValue = 0;
    result.forEach(day => {
      const dailyTotal = day.recharge + day.expense;
      if (dailyTotal > maxValue) maxValue = dailyTotal;
    });
    maxValue = maxValue || 1;

    let html = '<div class="trend-chart">';

    result.forEach(day => {
      const dailyTotal = day.recharge + day.expense;
      const rechargePercent = (day.recharge / maxValue) * 100;
      const expensePercent = (day.expense / maxValue) * 100;
      const dateDisplay = day.date.substring(5);

      html += `
        <div class="trend-bar">
          <div class="trend-date">${dateDisplay}</div>
          <div class="trend-bar-track" style="position: relative; display: flex;">
            <div class="trend-bar-fill trend-recharge" style="width: ${rechargePercent}%; background: var(--success);"></div>
            <div class="trend-bar-fill trend-expense" style="width: ${expensePercent}%; background: var(--danger);"></div>
          </div>
          <div class="trend-amount">$${dailyTotal}</div>
        </div>
      `;
    });

    html += `
        <div class="trend-legend">
          <span><span style="background: var(--success);"></span> 儲值</span>
          <span><span style="background: var(--danger);"></span> 支出</span>
        </div>
      </div>
    `;

    container.innerHTML = html;

  } catch (error) {
    console.error('載入交易趨勢失敗:', error);
    if (container) container.innerHTML = `<div class="message error">❌ ${escapeHtml(error.message)}</div>`;
  }
}

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

window.loadAdminAnalytics = loadAdminAnalytics;

console.log('📈 統計分析模組已載入（Supabase 版）');
