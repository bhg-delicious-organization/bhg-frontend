// ==================== register.js ====================
// 使用者註冊模組（Supabase Auth）
// ====================================================

async function registerUser(event) {
  const btn = event ? event.currentTarget : null;

  const studentId = document.getElementById('registerStudentId').value.trim();
  const name = document.getElementById('registerName').value.trim();
  const password = document.getElementById('registerPassword').value;

  // 驗證
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

  if (btn) setButtonLoading(btn, true);
  if (resultDiv) showConanLoading('registerResult', 'registerUser');

  try {
    const sb = await initSupabase();

    // 1. 檢查學號是否已存在
    const { data: existing } = await sb
      .from('users')
      .select('user_id')
      .eq('user_id', studentId)
      .maybeSingle();

    if (existing) {
      if (btn) setButtonLoading(btn, false);
      if (resultDiv) {
        resultDiv.innerHTML = `<div class="message error">❌ 該學號已註冊過</div>`;
      }
      return;
    }

    // 2. 建立 Supabase Auth 帳號
    const email = `${studentId}@bhg.local`;
    const { data: authData, error: authError } = await sb.auth.signUp({
      email: email,
      password: password
    });

    if (authError) {
      if (btn) setButtonLoading(btn, false);
      if (resultDiv) {
        resultDiv.innerHTML = `<div class="message error">❌ ${escapeHtml(authError.message)}</div>`;
      }
      return;
    }

    // 3. 寫入 users 表
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
      if (resultDiv) {
        resultDiv.innerHTML = `<div class="message error">❌ ${escapeHtml(insertError.message)}</div>`;
      }
      return;
    }

    // 4. 成功
    if (resultDiv) {
      resultDiv.innerHTML = `<div class="message success"><i class="fas fa-check-circle"></i> 申請成功！請用學號和密碼登入</div>`;
    }

    document.getElementById('registerStudentId').value = '';
    document.getElementById('registerName').value = '';
    document.getElementById('registerPassword').value = '';

    showMessageModal('✅ 申請成功', `學號 ${studentId} 已建立，請用學號和密碼登入`);

  } catch (error) {
    if (btn) setButtonLoading(btn, false);
    console.error('註冊失敗:', error);
    if (resultDiv) {
      resultDiv.innerHTML = `<div class="message error">❌ ${escapeHtml(error.message)}</div>`;
    }
  }
}

window.registerUser = registerUser;

console.log('📝 註冊模組已載入');
