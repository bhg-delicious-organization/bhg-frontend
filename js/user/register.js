// ==================== register.js ====================
// 使用者註冊模組（Supabase Auth）
// 依賴：api.js、supabase.js、state.js、ui.js、common.js、core.js
// ====================================================

/**
 * 註冊新使用者
 */
async function registerUser(event) {
  const btn = event ? event.currentTarget : null;

  const studentId = document.getElementById('registerStudentId').value.trim();
  const name = document.getElementById('registerName').value.trim();
  const password = document.getElementById('registerPassword').value;

  // ========== 輸入驗證 ==========
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

  if (!password) {
    showMessageModal('❌ 輸入錯誤', '請設定密碼');
    return;
  }

  if (password.length < 6) {
    showMessageModal('❌ 輸入錯誤', '密碼至少 6 位');
    return;
  }

  const resultDiv = document.getElementById('registerResult');

  if (btn) {
    setButtonLoading(btn, true);
  }

  if (resultDiv) {
    showConanLoading('registerResult', 'registerUser');
  }

  try {
    const sb = await initSupabase();

    // ========== 1. 檢查學號是否已存在 ==========
    const { data: existing, error: checkError } = await sb
      .from('users')
      .select('user_id')
      .eq('user_id', studentId)
      .maybeSingle();

    if (checkError) {
      console.error('檢查學號失敗:', checkError);
    }

    if (existing) {
      if (btn) setButtonLoading(btn, false);
      if (resultDiv) {
        resultDiv.innerHTML = `<div class="message error">❌ 該學號已註冊過</div>`;
      }
      return;
    }

    // ========== 2. 建立 Supabase Auth 帳號 ==========
    const email = `${studentId}@bhg.local`;
    const { data: authData, error: authError } = await sb.auth.signUp({
      email: email,
      password: password
    });

    if (authError) {
      if (btn) setButtonLoading(btn, false);
      console.error('Auth 註冊失敗:', authError);

      let errorMessage = authError.message;
      if (authError.message.includes('already registered')) {
        errorMessage = '該學號已註冊過';
      } else if (authError.message.includes('Password')) {
        errorMessage = '密碼格式錯誤';
      }

      if (resultDiv) {
        resultDiv.innerHTML = `<div class="message error">❌ ${escapeHtml(errorMessage)}</div>`;
      }
      return;
    }

    if (!authData.user) {
      if (btn) setButtonLoading(btn, false);
      if (resultDiv) {
        resultDiv.innerHTML = `<div class="message error">❌ 註冊失敗，請稍後再試</div>`;
      }
      return;
    }

    // ========== 3. 寫入 users 表 ==========
    const { error: insertError } = await sb
      .from('users')
      .insert({
        user_id: studentId,
        name: name,
        balance: 0,
        auth_uid: authData.user.id
      });

    if (btn) setButtonLoading(btn, false);

    if (insertError) {
      console.error('寫入 users 失敗:', insertError);
      if (resultDiv) {
        resultDiv.innerHTML = `<div class="message error">❌ ${escapeHtml(insertError.message)}</div>`;
      }
      return;
    }

    // ========== 4. 成功 ==========
    if (resultDiv) {
      resultDiv.innerHTML = `<div class="message success"><i class="fas fa-check-circle"></i> 申請成功！請用學號和密碼登入</div>`;
    }

    // 清空表單
    document.getElementById('registerStudentId').value = '';
    document.getElementById('registerName').value = '';
    document.getElementById('registerPassword').value = '';

    // ========== 5. 詢問是否記住學號 ==========
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

  } catch (error) {
    if (btn) setButtonLoading(btn, false);
    console.error('註冊失敗:', error);

    if (resultDiv) {
      resultDiv.innerHTML = `<div class="message error">❌ ${escapeHtml(error.message || '註冊失敗')}</div>`;
    }
  }
}

/**
 * 清除註冊表單
 */
function clearRegisterForm() {
  const studentIdInput = document.getElementById('registerStudentId');
  const nameInput = document.getElementById('registerName');
  const passwordInput = document.getElementById('registerPassword');
  const resultDiv = document.getElementById('registerResult');

  if (studentIdInput) studentIdInput.value = '';
  if (nameInput) nameInput.value = '';
  if (passwordInput) passwordInput.value = '';
  if (resultDiv) resultDiv.innerHTML = '';
}

window.registerUser = registerUser;
window.clearRegisterForm = clearRegisterForm;

console.log('📝 註冊模組已載入');
