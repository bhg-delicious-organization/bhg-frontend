// ==================== ui.js ====================
// UI 控制模組
// 依賴：無（但部分函數使用 AppState，需確保已載入）
// ====================================================

const UI = {
  /**
   * 顯示訊息模態窗
   */
  showMessage: function(title, message, type = 'info') {
    const titleEl = document.getElementById('messageTitle');
    const contentEl = document.getElementById('messageContent');
    const modal = document.getElementById('messageModal');
    if (titleEl && contentEl && modal) {
      const icon = type === 'error' ? 'fa-exclamation-circle' :
                   type === 'success' ? 'fa-check-circle' : 'fa-info-circle';
      titleEl.innerHTML = `<i class="fas ${icon}"></i> ${title}`;
      contentEl.textContent = message;
      modal.classList.add('active');
    } else {
      // 若模態窗不存在，退回 alert（開發用）
      console.warn('模態窗不存在，改用 alert:', title, message);
    }
  },

  closeMessage: function() {
    const modal = document.getElementById('messageModal');
    if (modal) modal.classList.remove('active');
  },

  /**
   * 顯示確認模態窗
   */
  showConfirm: function(title, message, onConfirm, onCancel) {
    const titleEl = document.getElementById('confirmTitle');
    const contentEl = document.getElementById('confirmContent');
    const modal = document.getElementById('confirmModal');
    if (titleEl && contentEl && modal) {
      titleEl.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${title}`;
      contentEl.textContent = message;
      window._confirmCallback = onConfirm;
      window._cancelCallback = onCancel || null;
      modal.classList.add('active');
    } else if (confirm(`${title}\n${message}`)) {
      if (onConfirm) onConfirm();
    } else if (onCancel) onCancel();
  },

  closeConfirm: function() {
    const modal = document.getElementById('confirmModal');
    if (modal) modal.classList.remove('active');
    window._confirmCallback = null;
    window._cancelCallback = null;
  },

  /**
   * 顯示載入狀態
   */
  showLoading: function(elementId, message = '載入中...') {
    const el = document.getElementById(elementId);
    if (el) {
      el.innerHTML = `<div class="loading"><div class="spinner"></div><p>${message}</p></div>`;
    }
  },

  /**
   * 設置按鈕載入狀態
   */
  setButtonLoading: function(button, isLoading, originalText = null) {
    if (!button) return;

    if (isLoading) {
      if (button.disabled && button.innerHTML.includes('spinner')) {
        return;
      }
      button._originalHTML = button.innerHTML;
      button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 處理中...';
      button.disabled = true;
    } else {
      const original = button._originalHTML || originalText || button.innerHTML;
      button.innerHTML = original;
      button.disabled = false;
      delete button._originalHTML;
    }
  },

  /**
   * 關閉所有模態窗
   */
  closeAllModals: function() {
    const modals = ['adminModal', 'changePasswordModal', 'messageModal', 'confirmModal', 'quickIdModal'];
    modals.forEach(id => {
      const modal = document.getElementById(id);
      if (modal) modal.classList.remove('active');
    });
    window._confirmCallback = null;
    window._cancelCallback = null;
  },

  /**
   * 更新管理員 UI
   */
  updateAdminUI: function() {
    const isAdminNow = (typeof AppState !== 'undefined') ? AppState.isAdmin() : false;

    const adminSections = ['adminQuerySection', 'adminRechargeSection', 'adminDirectRechargeSection', 'adminMealSection', 'adminInfo'];
    adminSections.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = isAdminNow ? 'block' : 'none';
    });

    const deductForm = document.getElementById('deductForm');
    const deductPrompt = document.getElementById('deductLoginPrompt');
    if (deductForm && deductPrompt) {
      deductForm.style.display = isAdminNow ? 'block' : 'none';
      deductPrompt.style.display = isAdminNow ? 'none' : 'block';
    }

    const restaurantForm = document.getElementById('restaurantForm');
    const restaurantPrompt = document.getElementById('restaurantLoginPrompt');
    if (restaurantForm && restaurantPrompt) {
      restaurantForm.style.display = isAdminNow ? 'block' : 'none';
      restaurantPrompt.style.display = isAdminNow ? 'none' : 'block';
    }

    const batchDeductSection = document.getElementById('batchDeductSection');
    if (batchDeductSection) batchDeductSection.style.display = isAdminNow ? 'block' : 'none';

    const adminLoginSection = document.getElementById('adminLoginSection');
    const adminLogoutSection = document.getElementById('adminLogoutSection');
    if (adminLoginSection && adminLogoutSection) {
      adminLoginSection.style.display = isAdminNow ? 'none' : 'block';
      adminLogoutSection.style.display = isAdminNow ? 'block' : 'none';
    }
  }
};

// ==================== 向後兼容的獨立函數 ====================

function showMessageModal(title, message) {
  UI.showMessage(title, message);
}

function closeMessageModal() {
  UI.closeMessage();
}

function showConfirmModal(title, message, onConfirm, onCancel) {
  UI.showConfirm(title, message, onConfirm, onCancel);
}

function closeConfirmModal() {
  UI.closeConfirm();
}

function confirmYes() {
  if (window._confirmCallback) window._confirmCallback();
  UI.closeConfirm();
}

function confirmNo() {
  if (window._cancelCallback) window._cancelCallback();
  UI.closeConfirm();
}

function showLoading(elementId, message) {
  UI.showLoading(elementId, message);
}

function setButtonLoading(button, isLoading, originalText) {
  UI.setButtonLoading(button, isLoading, originalText);
}

function closeAllModals() {
  UI.closeAllModals();
}

function updateAdminUI() {
  UI.updateAdminUI();
}

window.UI = UI;

console.log('🎨 UI 模組已載入');
