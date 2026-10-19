// ==================== notify.js ====================
// OneSignal 推播管理（emoji 版）
// 依賴：OneSignal SDK、supabase.js
// ====================================================

async function toggleNotifications(event) {
  const btn = event ? event.currentTarget : null;

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
      const subId = OneSignal.User.PushSubscription.id;

      await OneSignal.User.PushSubscription.optOut();

      if (subId) {
        await removeSubscriptionById(subId);
      }

      showMessageModal('🔕 已關閉通知', '您將不會收到推播通知');
    } else {
      await OneSignal.User.PushSubscription.optIn();
      await new Promise(r => setTimeout(r, 2000));

      const subId = OneSignal.User.PushSubscription.id;
      const studentId = AppState.currentStudentId();

      if (subId) {
        await saveSubscriptionById(subId, studentId || '');
      }

      showMessageModal('🔔 已開啟通知', '您將收到今日餐廳等通知');
    }

    updateNotifyButton();
  } catch (error) {
    console.error('切換通知失敗:', error);
    showMessageModal('❌ 錯誤', '操作失敗，請稍後再試');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.style.opacity = '';
      btn.style.pointerEvents = '';
    }
  }
}

async function saveSubscriptionById(subscriptionId, studentId = '') {
  if (!subscriptionId) return { success: false, message: '訂閱 ID 不能為空' };

  try {
    const sb = await initSupabase();

    const { data, error } = await sb
      .from('subscriptions')
      .upsert(
        {
          subscription_id: subscriptionId,
          user_id: studentId || null,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'subscription_id' }
      )
      .select();

    if (error) throw new Error(error.message);

    return { success: true, message: '已儲存訂閱' };
  } catch (error) {
    console.error('儲存訂閱失敗:', error);
    return { success: false, message: error.message };
  }
}

async function removeSubscriptionById(subscriptionId) {
  if (!subscriptionId) return { success: false, message: '訂閱 ID 不能為空' };

  try {
    const sb = await initSupabase();

    const { error } = await sb
      .from('subscriptions')
      .delete()
      .eq('subscription_id', subscriptionId);

    if (error) throw new Error(error.message);

    return { success: true };
  } catch (error) {
    console.error('移除訂閱失敗:', error);
    return { success: false, message: error.message };
  }
}

function updateNotifyButton() {
  try {
    const icon = document.getElementById('notifyIcon');
    const text = document.getElementById('notifyText');

    if (!window.OneSignal) return;

    const isSubscribed = OneSignal.User.PushSubscription.optedIn;

    if (isSubscribed) {
      if (icon) icon.textContent = '🔔';
      if (text) text.textContent = '已開啟';
    } else {
      if (icon) icon.textContent = '🔕';
      if (text) text.textContent = '通知';
    }
  } catch (error) {
    console.error('更新按鈕失敗:', error);
  }
}

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

    if (isSubscribed) {
      const subId = OneSignal.User.PushSubscription.id;
      const studentId = AppState.currentStudentId();

      // 匿名不回報到 DB，只留在 OneSignal 端
      if (subId && studentId) {
        await saveSubscriptionById(subId, studentId);
      } else {
        console.log('ℹ️ 匿名使用者，訂閱僅保留在 OneSignal 端，不寫入資料庫');
      }
    }

    updateNotifyButton();
  } catch (error) {
    console.error('檢查訂閱狀態失敗:', error);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(checkSubscriptionStatus, 3000);
});

window.toggleNotifications = toggleNotifications;
window.checkSubscriptionStatus = checkSubscriptionStatus;

console.log('🔔 推播模組已載入（emoji 版）');
