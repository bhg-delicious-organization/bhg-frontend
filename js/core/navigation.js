// ==================== navigation.js ====================
// 導航控制模組
// 依賴：state.js、ui.js、time.js
// ====================================================

/**
 * 智慧首頁判斷
 * 依據：管理模式 + 學號 + 時間 + 餐廳
 */
function getSmartHomePage() {
  const isAdminMode = AppState.isAdminMode();
  const studentId = AppState.currentStudentId();
  const currentTime = getCurrentTimeNumber();

  // 管理員模式
  if (isAdminMode) {
    if (currentTime >= TIME.ADMIN_START && currentTime < TIME.ADMIN_END) {
      return 'admin-restaurant';
    }
    return 'admin-query';
  }

  // 未登入學號
  if (!studentId) {
    return 'user-register';
  }

  // 三個 AND 條件
  const isOrderTime = currentTime >= TIME.ORDER_START && currentTime < TIME.ORDER_END;
  const hasRestaurant = !!AppState.currentRestaurantName();

  console.log('🏠 智慧首頁判斷:');
  console.log('   現在時間:', currentTime);
  console.log('   點餐時間:', `${TIME.ORDER_START} ~ ${TIME.ORDER_END}`);
  console.log('   在點餐時間內:', isOrderTime);
  console.log('   今日餐廳:', AppState.currentRestaurantName() || '未設定');
  console.log('   → 導向:', (isOrderTime && hasRestaurant) ? 'user-meal' : 'user-query');

  if (isOrderTime && hasRestaurant) {
    return 'user-meal';
  }
  return 'user-query';
}

/**
 * 導航到指定頁面
 */
async function navigateTo(pageName) {
  console.log('📄 導航到:', pageName);

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

  // 更新導覽列 active
  const isAdminModeNow = AppState.isAdminMode();
  const activeNav = isAdminModeNow ? '.admin-nav' : '.user-nav';
  document.querySelectorAll(`${activeNav} .nav-item`).forEach(item => {
    item.classList.remove('active');
  });
  const activeItem = document.querySelector(`${activeNav} [data-page="${pageName}"]`);
  if (activeItem) activeItem.classList.add('active');

  // 隱藏所有頁面
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

      const loader = document.getElementById('page-loader');
      if (loader) loader.remove();

      pageContent.insertAdjacentHTML('beforeend', html);
      targetPage = document.getElementById('page-' + pageName);
      console.log('✅ 頁面片段已載入:', pageName);
    } catch (error) {
      console.error('❌ 載入頁面失敗:', error);
      showMessageModal('❌ 載入失敗', `無法載入頁面：${pageName}`);
      return;
    }
  } else {
    const loader = document.getElementById('page-loader');
    if (loader) loader.remove();
  }

  if (targetPage) {
    targetPage.classList.add('active');
    AppState.setCurrentPage(pageName);

    switch (pageName) {
      case 'user-system':
        if (typeof loadSystemInfo === 'function') loadSystemInfo();
        break;
      case 'admin-restaurant':
        if (typeof loadTodayRestaurantStatus === 'function') loadTodayRestaurantStatus();
        break;
      case 'admin-batch-deduct':
        if (typeof loadBatchDeductData === 'function') loadBatchDeductData();
        break;
      case 'admin-giftcode':
        if (typeof loadRecentGiftCodes === 'function') {
          setTimeout(loadRecentGiftCodes, 100);
        }
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
      case 'user-account':
        if (typeof loadAccountPage === 'function') loadAccountPage();
        break;
      case 'user-changepwd':
        if (typeof loadChangePwdPage === 'function') loadChangePwdPage();
        break;
    }

    console.log('📢 發送 pageLoaded 事件:', pageName);
    window.dispatchEvent(new CustomEvent('pageLoaded', {
      detail: { pageName: pageName }
    }));
  }
}

/**
 * 切換到管理員模式
 */
function switchToAdminMode() {
  if (!AppState.isAdmin()) {
    if (typeof showAdminModal === 'function') showAdminModal();
    return;
  }
  if (AppState.isAdminMode()) return;

  AppState.setAdminMode(true);

  const userNav = document.querySelector('.user-nav');
  const adminNav = document.querySelector('.admin-nav');
  const toggleBtn = document.getElementById('navToggleBtn');

  if (userNav) { userNav.style.display = 'none'; userNav.classList.remove('hidden'); }
  if (adminNav) { adminNav.style.display = 'flex'; adminNav.classList.remove('hidden'); }
  if (toggleBtn) { toggleBtn.style.display = 'flex'; toggleBtn.classList.remove('nav-hidden'); }

  window.navHidden = false;

  navigateTo(isAdminRestaurantTime() ? 'admin-restaurant' : 'admin-query');
}

/**
 * 切換回使用者模式
 */
function switchToUserMode() {
  if (!AppState.isAdminMode()) return;

  AppState.setAdminMode(false);

  const userNav = document.querySelector('.user-nav');
  const adminNav = document.querySelector('.admin-nav');
  const toggleBtn = document.getElementById('navToggleBtn');

  if (adminNav) { adminNav.style.display = 'none'; adminNav.classList.remove('hidden'); }
  if (userNav) { userNav.style.display = 'flex'; userNav.classList.remove('hidden'); }
  if (toggleBtn) { toggleBtn.style.display = 'flex'; toggleBtn.classList.remove('nav-hidden'); }

  window.navHidden = false;

  navigateTo(getSmartHomePage());
}

window.getSmartHomePage = getSmartHomePage;
window.navigateTo = navigateTo;
window.switchToAdminMode = switchToAdminMode;
window.switchToUserMode = switchToUserMode;

console.log('🧭 導航模組已載入');
