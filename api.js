// ==================== api.js ====================
// 統一 API 呼叫層
// ====================================================

const GAS_URL = 'https://script.google.com/macros/s/AKfycbznWd75PHW1plPeS552pFafhDA4sJ3Lmf8wXLdhG277UlBaJ_lAA86VMzNL_1-yijiZPQ/exec';

async function callApi(action, data = {}, withToken = false) {
  const payload = {
    action: action,
    data: data,
    origin: window.location.origin
  };

  if (withToken) {
    const token = sessionStorage.getItem('adminToken');
    if (token) payload.token = token;
    const csrfToken = sessionStorage.getItem('csrfToken');
    if (csrfToken) payload.csrfToken = csrfToken;
  }

  try {
    const response = await fetch(GAS_URL, {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();

  } catch (error) {
    console.error(`API 呼叫失敗 [${action}]:`, error);
    return {
      success: false,
      message: '連線失敗，請稍後再試'
    };
  }
}

async function callAdminApi(action, data = {}) {
  return callApi(action, data, true);
}

window.callApi = callApi;
window.callAdminApi = callAdminApi;

console.log('📡 api.js 已載入');
