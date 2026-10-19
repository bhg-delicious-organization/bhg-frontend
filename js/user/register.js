// ==================== register.js ====================
// 登入 / 註冊模組（強制登入版）
// 依賴：supabase.js、state.js、ui.js、common.js、core.js、navigation.js
// ==================================================

function initRegisterPage() {
  const loginSection = document.getElementById('loginSection');
  const registerSection = document.getElementById('registerSection');
  if (loginSection) loginSection.style.display = 'block';
  if (registerSection) registerSection.style.display = 'none';

  const loginStudentId = document.getElementById('loginStudentId');
  const loginPassword = document.getElementById('loginPassword');
  if (loginStudentId) loginStudentId.value = '';
  if (loginPassword) loginPassword.value = '';

  const loginResult = document.getElementById('loginResult');
  if (loginResult) loginResult.innerHTML = '';
}

function switchToRegister() {
  const loginSection = document.getElementById('loginSection');
  const registerSection = document.getElementById('registerSection');
  if (loginSection) loginSection.style.display = 'none';
  if (registerSection) registerSection.style.display = 'block';

  const registerResult = document.getElementById('registerResult');
  if (registerResult) registerResult.innerHTML = '';
}

function switchToLogin() {
  const loginSection = document.getElementById('loginSection');
  const registerSection = document.getElementById('registerSection');
  if (loginSection) loginSection.style.display = 'block';
  if (registerSection) registerSection.style.display = 'none';

  const loginResult = document.getElementById('loginResult');
  if (loginResult) loginResult.innerHTML = '';
}

/**
 * 登入（從登入閘門）
 */
async function loginFromGate(event) {
  const btn = event ? event.currentTarget : null;

  const studentId = document.getElementById('loginStudentId').value.trim();
  const password = document.getElementById('loginPassword').value;
  const resultDiv = document.getElementById('loginResult');

  if (!studentId || !/^\d{6}$/.test(studentId)) {
    if (resultDiv) resultDiv.innerHTML = '<div class="message error">請輸入6位數學號</div>';
    return;
  }

  if (!password) {
    if (resultDiv) resultDiv.innerHTML = '<div class="message error">請輸入密碼</div>';
    return;
  }

  if (btn) setButtonLoading(btn, true);
  if (resultDiv) showConanLoading('loginResult', 'verifyUserPassword');

  try {
    const sb = await initSupabase();
    const email = `${studentId}@bhg.app`;

    const { data, error } = await sb.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (btn) setButtonLoading(btn, false);

    if (error) {
      if (resultDiv) {
        resultDiv.innerHTML = `<div class="message error">❌ 學號或密碼錯誤</div>`;
      }
      return;
    }

    AppState.setCurrentStudentId(studentId);
    fillAllStudentIdInputs(studentId, true);

    if (resultDiv) {
      resultDiv.innerHTML = `<div class="message success">✅ 登入成功</div>`;
    }

    showMessageModal('✅ 登入成功', '歡迎回來');

    setTimeout(() => {
      navigateTo(getSmartHomePage());
    }, 800);

  } catch (error) {
    if (btn) setButtonLoading(btn, false);
    console.error('登入失敗:', error);
    if (resultDiv) {
      resultDiv.innerHTML = `<div class="message error">❌ ${escapeHtml(error.message)}</div>`;
    }
  }
}

/**
 * 註冊新使用者
 */
async function registerUser(event) {
  const btn = event ? event.currentTarget : null;

  const studentId = document.getElementById('registerStudentId').value.trim();
  const name = document.getElementById('registerName').value.trim();
  const password = document.getElementById('registerPassword').value;

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

    // 2. 建立 Supabase Auth 帳號
    const email = `${studentId}@bhg.app`;
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
      } else if (authError.message.includes('invalid')) {
        errorMessage = '學號格式錯誤';
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
      console.error('寫入 users 失敗:', insertError);
      if (resultDiv) {
        resultDiv.innerHTML = `<div class="message error">❌ ${escapeHtml(insertError.message)}</div>`;
      }
      return;
    }

    // 4. 註冊成功
    if (resultDiv) {
      resultDiv.innerHTML = `<div class="message success"><i class="fas fa-check-circle"></i> 申請成功！正在登入...</div>`;
    }

    // 5. 自動登入
    const { data: loginData, error: loginError } = await sb.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (!loginError && loginData.session) {
      AppState.setCurrentStudentId(studentId);
      fillAllStudentIdInputs(studentId, true);

      setTimeout(() => {
        navigateTo(getSmartHomePage());
      }, 800);
    } else {
      // 自動登入失敗 → 切回登入
      showMessageModal('✅ 申請成功', '請用學號和密碼登入');
      switchToLogin();
      document.getElementById('loginStudentId').value = studentId;
    }

  } catch (error) {
    if (btn) setButtonLoading(btn, false);
    console.error('註冊失敗:', error);

    if (resultDiv) {
      resultDiv.innerHTML = `<div class="message error">❌ ${escapeHtml(error.message || '註冊失敗')}</div>`;
    }
  }
}

window.initRegisterPage = initRegisterPage;
window.switchToRegister = switchToRegister;
window.switchToLogin = switchToLogin;
window.loginFromGate = loginFromGate;
window.registerUser = registerUser;

console.log('📝 登入 / 註冊模組已載入（強制登入版）');
