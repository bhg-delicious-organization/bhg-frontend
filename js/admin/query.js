// ==================== query.js ====================
// 管理員查詢模組（Supabase 版）
// 依賴：supabase.js、state.js、ui.js、common.js、core.js
// ====================================================

async function getAllBalances(event) {
  const btn = event ? event.currentTarget : null;
  if (btn) setButtonLoading(btn, true);

  const resultDiv = document.getElementById('adminQueryResult');
  if (resultDiv) showConanLoading('adminQueryResult', 'getAllBalances');

  try {
    const sb = await initSupabase();

    const { data: users, error } = await sb
      .from('users')
      .select('user_id, name, balance')
      .order('user_id');

    if (btn) setButtonLoading(btn, false);

    if (error) throw new Error(error.message);

    if (!users || users.length === 0) {
      if (resultDiv) resultDiv.innerHTML = '<div class="message info">暫無使用者資料</div>';
      return;
    }

    let html = '<div class="table-container"><table class="table">';
    html += '<thead><tr><th>學號</th><th>姓名</th><th>餘額</th></tr></thead><tbody>';

    users.forEach(user => {
      const balanceClass = Number(user.balance) < 0 ? 'balance-negative' : 'balance-positive';
      html += `<tr>
        <td>${escapeHtml(user.user_id)}</td>
        <td>${escapeHtml(user.name)}</td>
        <td class="${balanceClass}">$${user.balance}</td>
      </tr>`;
    });

    html += `</tbody></table></div>`;
    html += `<p style="margin-top: 10px; color: var(--gray);">共 ${users.length} 位使用者</p>`;

    if (resultDiv) resultDiv.innerHTML = html;

  } catch (error) {
    if (btn) setButtonLoading(btn, false);
    console.error('查詢全體餘額失敗:', error);
    if (resultDiv) resultDiv.innerHTML = `<div class="message error">❌ ${escapeHtml(error.message)}</div>`;
  }
}

async function getLowBalanceUsers(event) {
  const btn = event ? event.currentTarget : null;
  if (btn) setButtonLoading(btn, true);

  const resultDiv = document.getElementById('adminQueryResult');
  if (resultDiv) showConanLoading('adminQueryResult', 'getLowBalanceUsers');

  try {
    const sb = await initSupabase();

    const { data: users, error } = await sb
      .from('users')
      .select('user_id, name, balance')
      .lt('balance', 100)
      .order('balance');

    if (btn) setButtonLoading(btn, false);

    if (error) throw new Error(error.message);

    if (!users || users.length === 0) {
      if (resultDiv) resultDiv.innerHTML = '<div class="message success">✅ 所有使用者餘額都在100元以上</div>';
      return;
    }

    let html = '<div class="table-container"><table class="table">';
    html += '<thead><tr><th>學號</th><th>姓名</th><th>餘額</th></tr></thead><tbody>';

    users.forEach(user => {
      const balanceClass = Number(user.balance) < 0 ? 'balance-negative' : 'balance-warning';
      html += `<tr>
        <td>${escapeHtml(user.user_id)}</td>
        <td>${escapeHtml(user.name)}</td>
        <td class="${balanceClass}">$${user.balance}</td>
      </tr>`;
    });

    html += `</tbody></table></div>`;
    html += `<p style="margin-top: 10px; color: var(--gray);">共 ${users.length} 位使用者餘額低於100元</p>`;

    if (resultDiv) resultDiv.innerHTML = html;

  } catch (error) {
    if (btn) setButtonLoading(btn, false);
    console.error('查詢低餘額失敗:', error);
    if (resultDiv) resultDiv.innerHTML = `<div class="message error">❌ ${escapeHtml(error.message)}</div>`;
  }
}

async function copyAllUsersList(event) {
  const btn = event ? event.currentTarget : null;
  if (btn) setButtonLoading(btn, true);

  try {
    const sb = await initSupabase();

    const { data: users, error } = await sb
      .from('users')
      .select('user_id, name, balance')
      .order('user_id');

    if (btn) setButtonLoading(btn, false);

    if (error) throw new Error(error.message);

    const now = new Date();
    const dateStr = now.toLocaleDateString('zh-TW');
    const timeStr = now.toLocaleTimeString('zh-TW', { hour12: false });

    let text = `【大家政便當廠】全體餘額查詢\n`;
    text += `生成時間：${dateStr} ${timeStr}\n\n`;

    users.forEach((user, index) => {
      const balanceStr = Number(user.balance) < 0
        ? `-$${Math.abs(user.balance)} ⚠️`
        : `$${user.balance}`;
      text += `${index + 1}. ${user.user_id} ${user.name}：${balanceStr}\n`;
    });

    text += `\n共 ${users.length} 位使用者\n`;

    await copyToClipboard(text);
    showMessageModal('✅ 複製成功', '全體餘額名單已複製到剪貼簿');

  } catch (error) {
    if (btn) setButtonLoading(btn, false);
    console.error('複製名單失敗:', error);
    showMessageModal('❌ 錯誤', error.message || '產生名單失敗');
  }
}

async function copyLowBalanceUsersList(event) {
  const btn = event ? event.currentTarget : null;
  if (btn) setButtonLoading(btn, true);

  try {
    const sb = await initSupabase();

    const { data: users, error } = await sb
      .from('users')
      .select('user_id, name, balance')
      .lt('balance', 100)
      .order('balance');

    if (btn) setButtonLoading(btn, false);

    if (error) throw new Error(error.message);

    const now = new Date();
    const dateStr = now.toLocaleDateString('zh-TW');
    const timeStr = now.toLocaleTimeString('zh-TW', { hour12: false });

    let text = `【大家政便當廠】餘額低於100元名單\n`;
    text += `生成時間：${dateStr} ${timeStr}\n`;
    text += `════════════════════\n\n`;

    if (!users || users.length === 0) {
      text += '所有使用者餘額都在100元以上 ✅';
    } else {
      users.forEach((user, index) => {
        const balanceStr = Number(user.balance) < 0
          ? `-$${Math.abs(user.balance)} ⚠️`
          : `$${user.balance}`;
        text += `${index + 1}. ${user.user_id} ${user.name}：${balanceStr}\n`;
      });
      text += `\n共 ${users.length} 位使用者餘額低於100元\n`;
    }

    await copyToClipboard(text);
    showMessageModal('✅ 複製成功', '低於100元名單已複製到剪貼簿');

  } catch (error) {
    if (btn) setButtonLoading(btn, false);
    console.error('複製名單失敗:', error);
    showMessageModal('❌ 錯誤', error.message || '產生名單失敗');
  }
}

async function viewErrorLogs(event) {
  const btn = event ? event.currentTarget : null;
  if (btn) setButtonLoading(btn, true);

  const resultDiv = document.getElementById('errorLogsDisplay');
  if (resultDiv) showConanLoading('errorLogsDisplay', 'getErrorLogs');

  try {
    const sb = await initSupabase();

    const { data: logs, error } = await sb
      .from('error_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(50);

    if (btn) setButtonLoading(btn, false);

    if (error) throw new Error(error.message);

    if (!logs || logs.length === 0) {
      if (resultDiv) resultDiv.innerHTML = '<div class="message info">暫無錯誤紀錄</div>';
      return;
    }

    let html = '<div class="table-container"><table class="table">';
    html += '<thead><tr><th>時間</th><th>來源</th><th>函數</th><th>錯誤類型</th><th>錯誤訊息</th></tr></thead><tbody>';

    logs.forEach(log => {
      const timeStr = log.timestamp ? new Date(log.timestamp).toLocaleString('zh-TW') : '--';
      html += `<tr>
        <td style="font-size: 0.8rem;">${escapeHtml(timeStr)}</td>
        <td>${escapeHtml(log.source || '--')}</td>
        <td>${escapeHtml(log.function_name || '--')}</td>
        <td>${escapeHtml(log.error_type || '--')}</td>
        <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(log.error_message || '--')}</td>
      </tr>`;
    });

    html += `</tbody></table></div>`;
    html += `<p style="margin-top: 10px; color: var(--gray);">顯示最近 ${logs.length} 筆</p>`;

    if (resultDiv) resultDiv.innerHTML = html;

  } catch (error) {
    if (btn) setButtonLoading(btn, false);
    console.error('載入錯誤紀錄失敗:', error);
    if (resultDiv) resultDiv.innerHTML = `<div class="message error">❌ ${escapeHtml(error.message)}</div>`;
  }
}

function loadAdminQuery() {
  const resultDiv = document.getElementById('adminQueryResult');
  if (resultDiv) {
    resultDiv.innerHTML = '<div class="message info">點擊「查詢全體餘額」或「查詢餘額低於100」查看資料</div>';
  }

  const errorDiv = document.getElementById('errorLogsDisplay');
  if (errorDiv) {
    errorDiv.innerHTML = '<div class="message info">點擊「重新載入」查看錯誤紀錄</div>';
  }
}

window.getAllBalances = getAllBalances;
window.getLowBalanceUsers = getLowBalanceUsers;
window.copyAllUsersList = copyAllUsersList;
window.copyLowBalanceUsersList = copyLowBalanceUsersList;
window.viewErrorLogs = viewErrorLogs;
window.loadAdminQuery = loadAdminQuery;

console.log('📊 管理員查詢模組已載入（Supabase 版）');
