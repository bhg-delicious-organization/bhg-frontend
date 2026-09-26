// ==================== register.js ====================
// 使用者註冊模組
// 依賴：api.js、state.js、ui.js、common.js、core.js
// ====================================================

/**
 * 註冊新使用者
 */
async function registerUser(event) {
  const btn = event ? event.currentTarget : null;

  const studentId = document.getElementById('registerStudentId').value.trim();
  const name = document.getElementById('registerName').value.trim();

  // 輸入驗證
  if (!studentId) {
    showMessageModal('❌ 輸入錯誤', '請輸入學號');
    return;
  }

  if (!/^\d{6}$/.test(studentId)) {
    showMessageModal('❌ 輸入錯誤', '學號必須為6位數字');
    return;
  }

  if (!name) {
    showMessageModal('❌ 輸入錯誤', '請輸入姓名');
    return;
  }

  if (name.length > 20) {
    showMessageModal('❌ 輸入錯誤', '姓名請勿超過20個字');
    return;
  }

  if (/[<>\"\'\\\/]/.test(name)) {
    showMessageModal('❌ 輸入錯誤', '姓名不可包含特殊字符');
    return;
  }

  const resultDiv = document.getElementById('registerResult');

  if (btn) {
    setButtonLoading(btn, true);
  }

  if (resultDiv) {
    resultDiv.innerHTML = '<div class="loading"><div class="spinner"></div>申請中...</div>';
  }

  // 呼叫 API
  const result = await callApi('registerUser', {
    userId: studentId,
    name: name
  });

  if (btn) {
    setButtonLoading(btn, false);
  }

  if (result.success) {
    if (resultDiv) {
      resultDiv.innerHTML = `<div class="message success"><i class="fas fa-check-circle"></i> ${escapeHtml(result.message)}</div>`;
    }

    // 清空表單
    document.getElementById('registerStudentId').value = '';
    document.getElementById('registerName').value = '';

    // 詢問是否記住學號
    showConfirmModal(
      '✅ 申請成功',
      `學號 ${studentId} 申請成功！\n\n是否要記住這個學號？\n記住後下次會自動填入查詢頁面。`,
      function() {
        AppState.setCurrentStudentId(studentId);
        const btnText = document.getElementById('quickIdBtnText');
        if (btnText) btnText.textContent = studentId;
        fillAllStudentIdInputs(studentId);
        showMessageModal('✅ 已記住', `學號 ${studentId} 已儲存`);
      },
      function() {
        showMessageModal('✅ 申請成功', `學號 ${studentId} 已建立，餘額 0 元`);
      }
    );
  } else {
    if (resultDiv) {
      resultDiv.innerHTML = `<div class="message error">❌ ${escapeHtml(result.message)}</div>`;
    }
  }
}

/**
 * 清除註冊表單
 */
function clearRegisterForm() {
  const studentIdInput = document.getElementById('registerStudentId');
  const nameInput = document.getElementById('registerName');
  const resultDiv = document.getElementById('registerResult');

  if (studentIdInput) studentIdInput.value = '';
  if (nameInput) nameInput.value = '';
  if (resultDiv) resultDiv.innerHTML = '';
}

window.registerUser = registerUser;
window.clearRegisterForm = clearRegisterForm;

console.log('📝 註冊模組已載入');
