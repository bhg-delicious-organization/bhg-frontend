// ==================== register.js ====================
// 登入 / 註冊模組（Sprint 1.4 改造版）
// 依賴：supabase.js、state.js、ui.js、common.js、core.js、navigation.js
// ====================================================

// ─── 自訂錯誤類別：讓失敗原因可控 ───
class RegisterError extends Error {
  constructor(code, userMessage, originalError = null) {
    super(code);
    this.code = code;
    this.userMessage = userMessage;
    this.originalError = originalError;
  }
}

// ─── 註冊輸入驗證：抽出來方便測試 ───
function validateRegisterInput(studentId, name, password) {
  if (!/^\d{6}$/.test(studentId)) return '學號必須是 6 位數字';
  if (!name || name.length > 20) return '姓名長度需在 1-20 字之間';
  if (/[<>"'\\\/\x00-\x1F]/.test(name)) return '姓名不可包含特殊字元';
  if (!password || password.length < 6) return '密碼至少 6 位';
  if (/^\d+$/.test(password) && password === studentId) {
    return '密碼不可與學號相同';
  }
  return null;
}

// ─── 初始化頁面（登入 / 註冊切換） ───
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

// ─── 登入（保留原樣，Sprint 2 才改） ───
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

// ─── 註冊（★ Sprint 1.4 重寫） ───
async function registerUser(event) {
  const btn = event ? event.currentTarget : null;

  const studentId = document.getElementById('registerStudentId').value.trim();
  const name = document.getElementById('registerName').value.trim();
  const password = document.getElementById('registerPassword').value;
  const resultDiv = document.getElementById('registerResult');

  // 前端驗證（只是 UX，後端仍會檢查）
  const validationError = validateRegisterInput(studentId, name, password);
  if (validationError) {
    showMessageModal('❌ 輸入錯誤', validationError);
    return;
  }

  if (btn) setButtonLoading(btn, true);
  if (resultDiv) showConanLoading('registerResult', 'registerUser');

  let authData = null;
  let phase = 'init';

  try {
    const sb = await initSupabase();

    // ═══════════════════════════════════════
    // 階段 1：查重（users 表）
    // ═══════════════════════════════════════
    phase = 'check_exist';

    const { data: existingUser } = await sb
      .from('users')
      .select('user_id')
      .eq('user_id', studentId)
      .maybeSingle();

    if (existingUser) {
      throw new RegisterError('ALREADY_EXISTS', '該學號已註冊過');
    }

    // ═══════════════════════════════════════
    // 階段 2：signUp（建立 auth 帳號）
    // ═══════════════════════════════════════
    phase = 'signup';

    const email = `${studentId}@bhg.app`;
    const { data: signUpData, error: signUpError } = await sb.auth.signUp({
      email: email,
      password: password
    });

    if (signUpError) {
      // 判斷是否為「email 已存在」→ 可能是孤兒帳號
      if (/already registered|already been registered|user already exists/i.test(signUpError.message)) {
        throw new RegisterError(
          'ORPHAN_AUTH',
          '此學號在系統中已有記錄，但帳號資料異常，請聯絡管理員處理'
        );
      }
      throw new RegisterError(
        'SIGNUP_FAILED',
        '註冊失敗，請稍後再試',
        signUpError
      );
    }

    authData = signUpData;

    if (!signUpData || !signUpData.user) {
      throw new RegisterError('SIGNUP_NO_USER', '註冊失敗，請稍後再試');
    }

    // ═══════════════════════════════════════
    // 階段 3：確認 session（Email 驗證關閉時應有此值）
    // ═══════════════════════════════════════
    phase = 'check_session';

    if (!signUpData.session) {
      // 理論上不會發生（Email 驗證已關閉），但保險起見
      throw new RegisterError(
        'NO_SESSION',
        '系統設定異常，請聯絡管理員'
      );
    }

    // ═══════════════════════════════════════
    // 階段 4：INSERT users（以 authenticated 身分）
    // ═══════════════════════════════════════
    phase = 'insert_users';

    const { error: insertError } = await sb.from('users').insert({
      user_id: studentId,
      name: name,
      balance: 0,
      auth_uid: signUpData.user.id
    });

    if (insertError) {
      // 判斷是否是 UNIQUE 衝突（race condition）
      if (/duplicate key|unique constraint/i.test(insertError.message)) {
        throw new RegisterError(
          'RACE_CONDITION',
          '該學號剛被其他人註冊，請重新整理後再試',
          insertError
        );
      }
      throw new RegisterError('INSERT_FAILED', '註冊失敗，請稍後再試', insertError);
    }

    // ═══════════════════════════════════════
    // 階段 5：成功
    // ═══════════════════════════════════════
    phase = 'success';

    AppState.setCurrentStudentId(studentId);
    fillAllStudentIdInputs(studentId, true);

    if (resultDiv) {
      resultDiv.innerHTML = `<div class="message success">
        <i class="fas fa-check-circle"></i> 申請成功！正在進入系統...
      </div>`;
    }

    setTimeout(() => {
      navigateTo(getSmartHomePage());
    }, 800);

  } catch (error) {
    // ═══════════════════════════════════════
    // 補償式回滾
    // ═══════════════════════════════════════
    if (authData && authData.user && phase !== 'success') {
      // 1. 先登出（清除 session）
      try {
        await (await initSupabase()).auth.signOut();
      } catch (e) {
        console.warn('signOut 失敗:', e);
      }

      // 2. 記錄到 error_logs（讓管理員知道有孤兒帳號）
      try {
        await (await initSupabase()).from('error_logs').insert({
          source: '前端',
          function_name: 'registerUser',
          error_type: 'ORPHAN_AUTH_CREATED',
          error_message: `auth 帳號已建立但 users 插入失敗（phase: ${phase}）`,
          description: JSON.stringify({
            studentId,
            auth_user_id: authData.user.id,
            phase,
            original_error: error.message
          })
        });
      } catch (e) {
        console.warn('記錄錯誤到 error_logs 失敗:', e);
      }
    }

    // ═══════════════════════════════════════
    // 顯示錯誤（模糊化）
    // ═══════════════════════════════════════
    if (resultDiv) {
      const userMessage = error instanceof RegisterError
        ? error.userMessage
        : '註冊失敗，請稍後再試（若持續失敗，請聯絡管理員）';

      resultDiv.innerHTML = `<div class="message error">❌ ${escapeHtml(userMessage)}</div>`;

      if (error.code) {
        resultDiv.innerHTML += `<div class="form-text" style="margin-top: 6px;">錯誤代碼：${error.code}</div>`;
      }
    }

    // 上報到 error_logs（若 common.js 有此函數）
    if (typeof reportFrontendError === 'function') {
      reportFrontendError('registerUser', error);
    }

    console.error('註冊失敗:', error);

  } finally {
    if (btn) setButtonLoading(btn, false);
  }
}

// ─── 掛載到 window ───
window.initRegisterPage = initRegisterPage;
window.switchToRegister = switchToRegister;
window.switchToLogin = switchToLogin;
window.loginFromGate = loginFromGate;
window.registerUser = registerUser;

console.log('📝 登入 / 註冊模組已載入（Sprint 1.4 版）');
