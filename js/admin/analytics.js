// ==================== analytics.js ====================
// 管理員統計分析模組
// 依賴：api.js、state.js、ui.js、common.js、core.js
// ====================================================

/**
 * 載入統計分析頁面
 */
function loadAdminAnalytics() {
  loadBasicStats();
  loadSpendingRanking();
  loadTransactionTrend();
}

/**
 * 載入基本統計
 */
async function loadBasicStats() {
  const container = document.getElementById('basicStats');
  if (!container) return;
  container.innerHTML = '<div class="loading"><div class="spinner"></div>載入中...</div>';

  const result = await callAdminApi('getBasicStats', {});

  if (!result.success) {
    container.innerHTML = `<div class="message error">❌ ${escapeHtml(result.message)}</div>`;
    return;
  }

  const s = result.stats;
  container.innerHTML = `
    <div class="stat-card">
      <div class="stat-icon">👥</div>
      <div class="stat-value">${s.totalUsers}</div>
      <div class="stat-label">總使用者</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon">💰</div>
      <div class="stat-value">$${s.totalRecharge}</div>
      <div class="stat-label">總儲值</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon">💸</div>
      <div class="stat-value">$${s.totalExpense}</div>
      <div class="stat-label">總消費</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon">📊</div>
      <div class="stat-value">$${s.totalBalance}</div>
      <div class="stat-label">系統總餘額</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon">📈</div>
      <div class="stat-value">$${s.averageBalance}</div>
      <div class="stat-label">平均餘額</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon">💳</div>
      <div class="stat-value">${s.totalTransactions}</div>
      <div class="stat-label">總交易筆數</div>
    </div>
  `;
}

/**
 * 載入消費排行
 */
async function loadSpendingRanking() {
  const container = document.getElementById('spendingRanking');
  if (!container) return;
  container.innerHTML = '<div class="loading"><div class="spinner"></div>載入中...</div>';

  const result = await callAdminApi('getSpendingRanking', { limit: 10 });

  if (!result.success) {
    container.innerHTML = `<div class="message error">❌ ${escapeHtml(result.message)}</div>`;
    return;
  }

  if (result.ranking.length === 0) {
    container.innerHTML = '<div class="message info">暫無消費紀錄</div>';
    return;
  }

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

  result.ranking.forEach((user, index) => {
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
    <p style="margin-top: 10px; color: var(--gray);">共 ${result.total} 位使用者有消費紀錄</p>
  `;

  container.innerHTML = html;
}

/**
 * 載入交易趨勢圖（堆疊長條圖）
 */
async function loadTransactionTrend() {
  const container = document.getElementById('trendChart');
  if (!container) return;
  container.innerHTML = '<div class="loading"><div class="spinner"></div>載入中...</div>';

  const result = await callAdminApi('getTransactionTrend', { days: 30 });

  if (!result.success) {
    container.innerHTML = `<div class="message error">❌ ${escapeHtml(result.message)}</div>`;
    return;
  }

  const trend = result.trend;
  if (trend.length === 0) {
    container.innerHTML = '<div class="message info">暫無交易資料</div>';
    return;
  }

  // 找出最大值
  let maxValue = 0;
  trend.forEach(day => {
    const dailyTotal = day.recharge + day.expense;
    if (dailyTotal > maxValue) maxValue = dailyTotal;
  });
  maxValue = maxValue || 1;

  let html = '<div class="trend-chart">';

  trend.forEach(day => {
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
}

window.loadAdminAnalytics = loadAdminAnalytics;

console.log('📈 統計分析模組已載入');
