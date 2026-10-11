// ==================== api.js ====================
// GAS 推播 API（唯一保留的 GAS 呼叫）
// ====================================================

const GAS_URL = 'https://script.google.com/macros/s/AKfycbwGpChoVd0K6InXzM6T962y0y5bLcVwNCJO0uy1RIcsyrMmz7-q5CMcNlh_9qDZfDPXUA/exec';

/**
 * 發送推播（僅供管理員設定餐廳後呼叫）
 */
async function notifyTodayRestaurant(restaurantName, orderEndTime) {
  try {
    const response = await fetch(GAS_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'notifyTodayRestaurant',
        data: {
          restaurantName: restaurantName,
          orderEndTime: orderEndTime
        }
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('發送推播失敗:', error);
    return { success: false, message: error.message };
  }
}

window.notifyTodayRestaurant = notifyTodayRestaurant;

console.log('📡 api.js 已載入（只保留推播）');
