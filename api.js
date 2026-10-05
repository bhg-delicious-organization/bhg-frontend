// ==================== api.js ====================
// 統一 API 呼叫層
// ====================================================

const GAS_URL = 'https://script.google.com/macros/s/AKfycbwGpChoVd0K6InXzM6T962y0y5bLcVwNCJO0uy1RIcsyrMmz7-q5CMcNlh_9qDZfDPXUA/exec';

/**
 * 需要排隊的 action（寫入類）
 */
const QUEUE_ACTIONS = [
  'registerUser',
  'submitOrder',
  'saveUserMeal',
  'adjustUserMealAmount',
  'rateMeal',
  'redeemGiftCode',
  'adminDirectRecharge',
  'deductBalance',
  'batchDeductByCategory',
  'setTodayRestaurant',
  'cutOffOrder',
  'changeUserId',
  'changeMyPassword',
  'changeAdminPassword',
  'generateGiftCode',
  'saveSubscription',
  'removeSubscription'
];

/**
 * 生成 UUID v4
 */
function generateRequestId() {
  if (crypto && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

async function callApi(action, data = {}, withToken = false) {
  const payload = {
    action: action,
    data: data,
    origin: window.location.origin
  };

  // ✅ 如果是需要排隊的 action，帶上 requestId
  if (QUEUE_ACTIONS.includes(action)) {
    payload.requestId = generateRequestId();
  }

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
