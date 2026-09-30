// ==================== query.js ====================
// 管理員查詢模組
// 依賴：api.js、state.js、ui.js、common.js、core.js
// ====================================================

/**
 * 查詢全體餘額
 */
async function getAllBalances(event) {
  const btn = event ? event.currentTarget : null;
  if (btn) setButtonLoading(btn, true);

  const resultDiv = document.getElementById('adminQueryResult');
  if (resultDiv) showConanLoading('adminQueryResult', 'getAllBalances');

  const result = await callAdminApi('getAllBalances', {});

  if (btn) setButtonLoading(btn, false);

  if (!result.success) {
    if (resultDiv) resultDiv.innerHTML = `<div class="message error">❌ ${escapeHtml(result.message)}</div>`;
    return;
  }

  if (result.users.length === 0) {
    if (resultDiv) resultDiv.innerHTML = '<div class="message info">暫無使用者資料</div>';
    return;
  }

  let html = '<div class="table-container"><table class="table">';
  html += '<thead><tr><th>學號</th><th>姓名</th><th>餘額</th></tr></thead><tbody>';

  result.users.forEach(user => {
    const balanceClass = user.balance < 0 ? 'balance-negative' : 'balance-positive';
    html += `<tr>
      <td>${escapeHtml(user.studentId)}</td>
      <td>${escapeHtml(user.name)}</td>
      <td class="${balanceClass}">$${user.balance}</td>
    </tr>`;
  });

  html += `</tbody></table></div>`;
  html += `<p style="margin-top: 10px; color: var(--gray);">共 ${result.count} 位使用者</p>`;

  if (resultDiv) resultDiv.innerHTML = html;
}

/**
 * 查詢餘額低於 100 元的使用者
 */
async function getLowBalanceUsers(event) {
  const btn = event ? event.currentTarget : null;
  if (btn) setButtonLoading(btn, true);

  const resultDiv = document.getElementById('adminQueryResult');
  if (resultDiv) showConanLoading('adminQueryResult', 'getLowBalanceUsers');

  const result = await callAdminApi('getLowBalanceUsers', {});

  if (btn) setButtonLoading(btn, false);

  if (!result.success) {
    if (resultDiv) resultDiv.innerHTML = `<div class="message error">❌ ${escapeHtml(result.message)}</div>`;
    return;
  }

  if (result.users.length === 0) {
    if (resultDiv) resultDiv.innerHTML = '<div class="message success">✅ 所有使用者餘額都在100元以上</div>';
    return;
  }

  let html = '<div class="table-container"><table class="table">';
  html += '<thead><tr><th>學號</th><th>姓名</th><th>餘額</th></tr></thead><tbody>';

  result.users.forEach(user => {
    const balanceClass = user.balance < 0 ? 'balance-negative' : 'balance-warning';
    html += `<tr>
      <td>${escapeHtml(user.studentId)}</td>
      <td>${escapeHtml(user.name)}</td>
      <td class="${balanceClass}">$${user.balance}</td>
    </tr>`;
  });

  html += `</tbody></table></div>`;
  html += `<p style="margin-top: 10px; color: var(--gray);">共 ${result.count} 位使用者餘額低於100元</p>`;

  if (resultDiv) resultDiv.innerHTML = html;
}

/**
 * 複製全體餘額名單
 */
async function copyAllUsersList(event) {
  const btn = event ? event.currentTarget : null;
  if (btn) setButtonLoading(btn, true);

  const result = await callAdminApi('generateAllUsersList', {});

  if (btn) setButtonLoading(btn, false);

  if (result.success) {
    try {
      await copyToClipboard(result.text);
      showMessageModal('✅ 複製成功', '全體餘額名單已複製到剪貼簿');
    } catch (err) {
      showMessageModal('❌ 複製失敗', '請手動選取複製');
    }
  } else {
    showMessageModal('❌ 錯誤', result.message || '產生名單失敗');
  }
}

/**
 * 複製低於 100 元名單
 */
async function copyLowBalanceUsersList(event) {
  const btn = event ? event.currentTarget : null;
  if (btn) setButtonLoading(btn, true);

  const result = await callAdminApi('generateLowBalanceUsersList', {});

  if (btn) setButtonLoading(btn, false);

  if (result.success) {
    try {
      await copyToClipboard(result.text);
      showMessageModal('✅ 複製成功', '低於100元名單已複製到剪貼簿');
    } catch (err) {
      showMessageModal('❌ 複製失敗', '請手動選取複製');
    }
  } else {
    showMessageModal('❌ 錯誤', result.message || '產生名單失敗');
  }
}

/**
 * 載入報錯紀錄
 */
async function viewErrorLogs(event) {
  const btn = event ? event.currentTarget : null;
  if (btn) setButtonLoading(btn, true);

  const resultDiv = document.getElementById('errorLogsDisplay');
  if (resultDiv) showConanLoading('errorLogsDisplay', 'getErrorLogs');

  const result = await callAdminApi('getErrorLogs', { limit: 50 });

  if (btn) setButtonLoading(btn, false);

  if (!result.success) {
    if (resultDiv) resultDiv.innerHTML = `<div class="message error">❌ ${escapeHtml(result.message)}</div>`;
    return;
  }

  if (result.logs.length === 0) {
    if (resultDiv) resultDiv.innerHTML = '<div class="message info">暫無錯誤紀錄</div>';
    return;
  }

  let html = '<div class="table-container"><table class="table">';
  html += '<thead><tr><th>時間</th><th>來源</th><th>函數</th><th>錯誤類型</th><th>錯誤訊息</th></tr></thead><tbody>';

  result.logs.forEach(log => {
    html += `<tr>
      <td style="font-size: 0.8rem;">${escapeHtml(log.timestamp)}</td>
      <td>${escapeHtml(log.source)}</td>
      <td>${escapeHtml(log.functionName)}</td>
      <td>${escapeHtml(log.errorType)}</td>
      <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(log.errorMessage)}</td>
    </tr>`;
  });

  html += `</tbody></table></div>`;
  html += `<p style="margin-top: 10px; color: var(--gray);">共 ${result.total} 筆紀錄，顯示最近 ${result.count} 筆</p>`;

  if (resultDiv) resultDiv.innerHTML = html;
}

/**
 * 載入管理員查詢頁面（初始化）
 */
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

console.log('📊 管理員查詢模組已載入');
