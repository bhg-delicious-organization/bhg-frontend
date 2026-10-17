// ==================== navigation.js ====================
// 導航控制模組
// 依賴：state.js、ui.js、time.js、core.js
// ==================================================

function getSmartHomePage() {
  const isAdminMode = AppState.isAdminMode();
  const studentId = AppState.currentStudentId();
  const currentTime = getCurrentTimeNumber();

  if (isAdminMode) {
    if (currentTime >= TIME.ADMIN_START && currentTime < TIME.ADMIN_END) {
      return 'admin-restaurant';
    }
    return 'admin-query';
  }

  if (!studentId) {
    return 'user-register';
  }

  const isOrderTime = currentTime >= TIME.ORDER_START && currentTime < TIME.ORDER_END;
  const hasRestaurant = !!AppState.currentRestaurantName();

  if (isOrderTime && hasRestaurant) {
    return 'user-meal';
  }
  return 'user-query';
}

async function navigateTo(pageName) {
  console.log('📄 導航到:', pageName);

  // 每次切頁都更新導覽列
  if (typeof updateNavigationVisibility === 'function') updateNavigationVisibility();

  const adminPages = [
    'admin-restaurant', 'admin-batch-deduct', 'admin-giftcode',
    'admin-query', 'admin-account', 'admin-analytics',
    'admin-orders', 'admin-users'
  ];
  if (adminPages.includes(pageName) && !AppState.isAdmin()) {
    showMessageModal('❌ 權限不足', '請先登入管理員');
    if (typeof showAdminModal === 'function') showAdminModal();
    return;
  }

  const isAdminModeNow = AppState.isAdminMode();
  const activeNav = isAdminModeNow ? '.admin-nav' : '.user-nav';
  document.querySelectorAll(`${activeNav} .nav-item`).forEach(item => {
    item.classList.remove('active');
  });
  const activeItem = document.querySelector(`${activeNav} [data-page="${pageName}"]`);
  if (activeItem) activeItem.classList.add('active');

  document.querySelectorAll('.page-container').forEach(page => {
    page.classList.remove('active');
  });

  let targetPage = document.getElementById('page-' + pageName);

  if (!targetPage) {
    const pageContent = document.getElementById('pageContent');
    if (!pageContent) {
      console.error('❌ 找不到 pageContent 容器');
      return;
    }

    try {
      console.log('📥 載入頁面片段:', pageName);
      const response = await fetch(`pages/${pageName}.html`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const html = await response.text();

      pageContent.insertAdjacentHTML('beforeend', html);
      targetPage = document.getElementById('page-' + pageName);
      console.log('✅ 頁面片段已載入:', pageName);
    } catch (error) {
      console.error('❌ 載入頁面失敗:', error);
      showMessageModal('❌ 載入失敗', `無法載入頁面：${pageName}`);
      return;
    }
  }

  if (targetPage) {
    targetPage.classList.add('active');
    AppState.setCurrentPage(pageName);

    switch (pageName) {
      case 'user-system':
        if (typeof loadSystemInfo === 'function') loadSystemInfo();
        break;
      case 'user-query':
        if (typeof refreshUserBalance === 'function') refreshUserBalance();
        break;
      case 'user-meal':
        if (typeof refreshMealInfo === 'function') refreshMealInfo();
        break;
      case 'user-account':
        if (typeof loadAccountPage === 'function') loadAccountPage();
        break;
      case 'admin-restaurant':
        if (typeof loadTodayRestaurantStatus === 'function') loadTodayRestaurantStatus();
        break;
      case 'admin-batch-deduct':
        if (typeof loadBatchDeductData === 'function') loadBatchDeductData();
        break;
      case 'admin-query':
        if (typeof loadAdminQuery === 'function') loadAdminQuery();
        break;
      case 'admin-analytics':
        if (typeof loadAdminAnalytics === 'function') loadAdminAnalytics();
        break;
      case 'admin-orders':
        if (typeof loadTodayOrders === 'function') loadTodayOrders();
        break;
      case 'admin-users':
        if (typeof initAdminUsersPage === 'function') initAdminUsersPage();
        break;
      case 'user-meal-order':
        if (typeof loadMealOrderPage === 'function') loadMealOrderPage();
        break;
      case 'user-changepwd':
        if (typeof loadChangePwdPage === 'function') loadChangePwdPage();
        break;
      case 'user-register':
        if (typeof initRegisterPage === 'function') initRegisterPage();
        break;
    }

    console.log('📢 發送 pageLoaded 事件:', pageName);
    window.dispatchEvent(new CustomEvent('pageLoaded', {
      detail: { pageName: pageName }
    }));
  }
}

function switchToAdminMode() {
  if (!AppState.isAdmin()) {
    if (typeof showAdminModal === 'function') showAdminModal();
    return;
  }
  if (AppState.isAdminMode()) return;

  AppState.setAdminMode(true);  // ← 會觸發訂閱，自動更新 UI
  window.navHidden = false;

  const userNav = document.querySelector('.user-nav');
  const adminNav = document.querySelector('.admin-nav');
  if (userNav) userNav.classList.remove('hidden');
  if (adminNav) adminNav.classList.remove('hidden');

  navigateTo(isAdminRestaurantTime() ? 'admin-restaurant' : 'admin-query');
}

function switchToUserMode() {
  if (!AppState.isAdminMode()) return;

  AppState.setAdminMode(false);  // ← 會觸發訂閱，自動更新 UI
  window.navHidden = false;

  const userNav = document.querySelector('.user-nav');
  const adminNav = document.querySelector('.admin-nav');
  if (userNav) userNav.classList.remove('hidden');
  if (adminNav) adminNav.classList.remove('hidden');

  navigateTo(getSmartHomePage());
}

window.getSmartHomePage = getSmartHomePage;
window.navigateTo = navigateTo;
window.switchToAdminMode = switchToAdminMode;
window.switchToUserMode = switchToUserMode;

console.log('🧭 導航模組已載入');
