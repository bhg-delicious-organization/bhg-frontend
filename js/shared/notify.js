// ==================== notify.js ====================
// OneSignal 推播管理
// 依賴：OneSignal SDK、api.js
// ====================================================

/**
 * 切換推播訂閱狀態
 * @param {Event} [event] - 按鈕點擊事件（可選）
 */
async function toggleNotifications(event) {
  const btn = event ? event.currentTarget : null;

  // 手動 disable，不替換 innerHTML
  if (btn) {
    btn.disabled = true;
    btn.style.opacity = '0.6';
    btn.style.pointerEvents = 'none';
  }

  try {
    if (!window.OneSignal) {
      showMessageModal('❌ 錯誤', 'OneSignal 尚未載入，請重新整理頁面');
      return;
    }

    await new Promise(r => {
      window.OneSignalDeferred.push(async () => r());
    });

    const isSubscribed = OneSignal.User.PushSubscription.optedIn;

    if (isSubscribed) {
      // 取消訂閱
      const subId = OneSignal.User.PushSubscription.id;

      await OneSignal.User.PushSubscription.optOut();

      // 從後端移除
      if (subId) {
        await callApi('removeSubscription', { subscriptionId: subId });
        console.log('📤 已從後端移除訂閱');
      }

      showMessageModal('🔕 已關閉通知', '您將不會收到推播通知');
    } else {
      // 訂閱
      await OneSignal.User.PushSubscription.optIn();
      await new Promise(r => setTimeout(r, 2000));

      const subId = OneSignal.User.PushSubscription.id;
      const studentId = AppState.currentStudentId();

      // 上報訂閱 ID 到後端
      if (subId) {
        const result = await callApi('saveSubscription', {
          subscriptionId: subId,
          studentId: studentId || ''
        });
        console.log('📤 訂閱 ID 已上報:', result);
      }

      showMessageModal('🔔 已開啟通知', '您將收到今日餐廳等通知');
    }

    updateNotifyButton();
  } catch (error) {
    console.error('切換通知失敗:', error);
    showMessageModal('❌ 錯誤', '操作失敗，請稍後再試');
  } finally {
    // 恢復按鈕狀態
    if (btn) {
      btn.disabled = false;
      btn.style.opacity = '';
      btn.style.pointerEvents = '';
    }
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
 * 檢查訂閱狀態（並自動上報）
 */
async function checkSubscriptionStatus() {
  try {
    if (!window.OneSignal) {
      console.log('ℹ️ OneSignal 尚未載入');
      return;
    }

    await new Promise(r => {
      window.OneSignalDeferred.push(async () => r());
    });

    const isSubscribed = OneSignal.User.PushSubscription.optedIn;
    console.log('🔔 推播訂閱狀態:', isSubscribed ? '已訂閱' : '未訂閱');

    // 若已訂閱，自動上報訂閱 ID
    if (isSubscribed) {
      const subId = OneSignal.User.PushSubscription.id;
      const studentId = AppState.currentStudentId();

      if (subId) {
        const result = await callApi('saveSubscription', {
          subscriptionId: subId,
          studentId: studentId || ''
        });
        console.log('📤 訂閱 ID 自動上報:', result);
      }
    }

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
