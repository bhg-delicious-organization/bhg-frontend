// ==================== navigation.js ====================
// 導航控制模組
// 依賴：state.js、ui.js、time.js、core.js
// ====================================================

function getSmartHomePage() {
  const isAdminMode = AppState.isAdminMode();
  const studentId = AppState.currentStudentId();
  const currentTime = getCurrentTimeNumber();

  if (isAdminMode) {
    if (currentTime >= TIME.ADMIN_START && currentTime < TIME.ADMIN_END) {
      return 'admin-operations';
    }
    return 'admin-analytics';
  }

  if (!studentId) {
    return 'user-register';
  }

  const isOrderTime = currentTime >= TIME.ORDER_START && currentTime < TIME.ORDER_END;
  const hasRestaurant = !!AppState.currentRestaurantName();

  if (isOrderTime && hasRestaurant) {
    return 'user-order';
  }
  return 'user-home';
}

async function navigateTo(pageName) {
  console.log('📄 導航到:', pageName);

  if (typeof updateNavigationVisibility === 'function') updateNavigationVisibility();

  const adminPages = [
    'admin-operations', 'admin-finance', 'admin-users', 'admin-analytics'
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
      case 'user-home':
        if (typeof refreshUserBalance === 'function') refreshUserBalance();
        break;
      case 'user-order':
        if (typeof refreshMealInfo === 'function') refreshMealInfo();
        break;
      case 'user-account':
        if (typeof loadAccountPage === 'function') loadAccountPage();
        break;
      case 'admin-operations':
        if (typeof loadTodayRestaurantStatus === 'function') loadTodayRestaurantStatus();
        break;
      case 'admin-finance':
        if (typeof loadBatchDeductData === 'function') loadBatchDeductData();
        break;
      case 'admin-users':
        if (typeof initAdminUsersPage === 'function') initAdminUsersPage();
        break;
      case 'admin-analytics':
        if (typeof loadAdminAnalytics === 'function') loadAdminAnalytics();
        break;
    }

    console.log('📢 發送 pageLoaded 事件:', pageName);
    window.dispatchEvent(new CustomEvent('pageLoaded', {
      detail: { pageName: pageName }
    }));
  }
}

// 初始化頁面內的 Tabs 切換（事件委派）
function initTabs() {
  if (window._tabsBound) return;
  window._tabsBound = true;

  document.addEventListener('click', function(e) {
    const tabBtn = e.target.closest('.tab-btn');
    if (!tabBtn) return;

    const tabsNav = tabBtn.closest('.tabs-nav');
    if (!tabsNav) return;

    tabsNav.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    tabBtn.classList.add('active');

    const targetId = tabBtn.dataset.tab;
    if (!targetId) return;

    const container = tabsNav.parentElement;
    const contents = container.querySelectorAll('.tab-content');
    
    contents.forEach(content => {
      if (content.id === targetId) {
        content.classList.add('active');
      } else {
        content.classList.remove('active');
      }
    });

    window.dispatchEvent(new CustomEvent('tabChanged', { detail: { tabId: targetId } }));
  });

  console.log('✅ Tabs 事件委派已綁定');
}

document.addEventListener('DOMContentLoaded', initTabs);

window.getSmartHomePage = getSmartHomePage;
window.navigateTo = navigateTo;
window.initTabs = initTabs;

console.log('🧭 導航模組已載入');
