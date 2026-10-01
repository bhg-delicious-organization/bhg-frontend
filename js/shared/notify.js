
// ==================== notify.js ====================
// OneSignal 推播管理
// 依賴：OneSignal SDK
// ====================================================

/**
 * 切換推播訂閱狀態
 */
async function toggleNotifications() {
  try {
    if (!window.OneSignal) {
      showMessageModal('❌ 錯誤', 'OneSignal 尚未載入，請重新整理頁面');
      return;
    }

    // 等 OneSignal 完全就緒
    await new Promise(resolve => {
      window.OneSignalDeferred.push(async function() {
        resolve();
      });
    });

    const isSubscribed = OneSignal.User.PushSubscription.optedIn;

    if (isSubscribed) {
      // 取消訂閱
      await OneSignal.User.PushSubscription.optOut();
      showMessageModal('🔕 已關閉通知', '您將不會收到推播通知');
    } else {
      // 訂閱（會觸發瀏覽器彈出「允許通知」）
      await OneSignal.User.PushSubscription.optIn();
      showMessageModal('🔔 已開啟通知', '您將收到今日餐廳等通知');
    }

    updateNotifyButton();
  } catch (error) {
    console.error('切換通知失敗:', error);
    showMessageModal('❌ 錯誤', '操作失敗，請稍後再試');
  }
}

/**
 * 更新通知按鈕圖示
 */
function updateNotifyButton() {
  try {
    const icon = document.getElementById('notifyIcon');
    const text = document.getElementById('notifyText');

    if (!window.OneSignal) return;

    const isSubscribed = OneSignal.User.PushSubscription.optedIn;

    if (isSubscribed) {
      if (icon) {
        icon.className = 'fas fa-bell';
        icon.style.color = 'var(--warning)';
      }
      if (text) text.textContent = '已開啟';
    } else {
      if (icon) {
        icon.className = 'fas fa-bell-slash';
        icon.style.color = '';
      }
      if (text) text.textContent = '通知';
    }
  } catch (error) {
    console.error('更新按鈕失敗:', error);
  }
}

/**
 * 檢查訂閱狀態
 */
async function checkSubscriptionStatus() {
  try {
    if (!window.OneSignal) {
      console.log('ℹ️ OneSignal 尚未載入');
      return;
    }

    // 等 OneSignal 初始化完成
    await new Promise(resolve => {
      window.OneSignalDeferred.push(async function() {
        resolve();
      });
    });

    const isSubscribed = OneSignal.User.PushSubscription.optedIn;
    console.log('🔔 推播訂閱狀態:', isSubscribed ? '已訂閱' : '未訂閱');

    updateNotifyButton();
  } catch (error) {
    console.error('檢查訂閱狀態失敗:', error);
  }
}

// 頁面載入時檢查
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(checkSubscriptionStatus, 3000);
});

// 掛載到 window
window.toggleNotifications = toggleNotifications;
window.checkSubscriptionStatus = checkSubscriptionStatus;

console.log('🔔 推播模組已載入');
