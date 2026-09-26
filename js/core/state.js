// ==================== state.js ====================
// 全域狀態管理 (AppState)
// 依賴：無
// ====================================================

const AppState = (function() {
  // ========== 私有變數 ==========
  let _isAdmin = false;
  let _adminToken = null;
  let _csrfToken = null;
  let _currentPage = 'user-query';
  let _currentStudentId = '';
  let _isAdminMode = false;
  let _currentRestaurantName = '';
  let _lotteryList = [];

  // 觀察者列表
  let _observers = {
    admin: [],
    page: [],
    studentId: [],
    adminMode: [],
    restaurant: [],
    lotteryList: []
  };

  // ========== 私有方法 ==========
  function _notify(event, data) {
    if (_observers[event]) {
      _observers[event].forEach(cb => {
        try { cb(data); } catch (e) { console.error(e); }
      });
    }
  }

  // ========== 公開 API ==========
  return {
    // ========== Getters ==========
    isAdmin: () => _isAdmin,
    adminToken: () => _adminToken,
    csrfToken: () => _csrfToken,
    currentPage: () => _currentPage,
    currentStudentId: () => _currentStudentId,
    isAdminMode: () => _isAdminMode,
    currentRestaurantName: () => _currentRestaurantName,
    getLotteryList: () => _lotteryList,

    // 向後兼容：rememberedStudentId 等同 currentStudentId
    rememberedStudentId: () => _currentStudentId,

    // ========== Setters ==========
    setAdmin: function(value, token, csrfToken) {
      const old = _isAdmin;
      _isAdmin = value;
      _adminToken = token || null;
      _csrfToken = csrfToken || null;

      if (value && token) {
        sessionStorage.setItem('adminToken', token);
        if (csrfToken) sessionStorage.setItem('csrfToken', csrfToken);
        localStorage.setItem('adminLoggedIn', 'true');
      } else {
        sessionStorage.removeItem('adminToken');
        sessionStorage.removeItem('csrfToken');
        localStorage.removeItem('adminLoggedIn');
      }
      _notify('admin', { old, new: value, token: _adminToken });
    },

    setCurrentPage: function(page) {
      const old = _currentPage;
      _currentPage = page;
      _notify('page', { old, new: page });
    },

    setCurrentStudentId: function(id) {
      const old = _currentStudentId;
      _currentStudentId = id;
      if (id) {
        sessionStorage.setItem('currentStudentId', id);
      } else {
        sessionStorage.removeItem('currentStudentId');
      }
      _notify('studentId', { old, new: id });
    },

    // 向後兼容
    setRememberedStudentId: function(id) {
      this.setCurrentStudentId(id);
    },

    setAdminMode: function(mode) {
      const old = _isAdminMode;
      _isAdminMode = mode;
      _notify('adminMode', { old, new: mode });
    },

    setCurrentRestaurantName: function(name) {
      const old = _currentRestaurantName;
      _currentRestaurantName = name;
      _notify('restaurant', { old, new: name });
    },

    /**
     * 初始化（從 localStorage/sessionStorage 讀取狀態）
     * @returns {boolean} 是否已登入管理員
     */
    init: function() {
      const saved = localStorage.getItem('adminLoggedIn');
      const savedToken = sessionStorage.getItem('adminToken');
      const savedCsrf = sessionStorage.getItem('csrfToken');

      let isLoggedIn = false;
      if (saved === 'true' && savedToken) {
        _isAdmin = true;
        _adminToken = savedToken;
        _csrfToken = savedCsrf || null;
        isLoggedIn = true;
      }

      const savedStudentId = sessionStorage.getItem('currentStudentId');
      if (savedStudentId) {
        _currentStudentId = savedStudentId;
      }

      return isLoggedIn;
    },

    logout: function() {
      this.setAdmin(false, null, null);
      this.setAdminMode(false);
      this.setCurrentStudentId('');
    },

    /**
     * 訂閱狀態變更
     */
    subscribe: function(event, callback) {
      if (_observers[event]) {
        _observers[event].push(callback);
        return () => {
          const idx = _observers[event].indexOf(callback);
          if (idx > -1) _observers[event].splice(idx, 1);
        };
      }
      return () => {};
    },

    getSnapshot: function() {
      return {
        isAdmin: _isAdmin,
        adminToken: _adminToken,
        csrfToken: _csrfToken,
        currentPage: _currentPage,
        currentStudentId: _currentStudentId,
        isAdminMode: _isAdminMode,
        currentRestaurantName: _currentRestaurantName
      };
    },

    setLotteryList: function(list) {
      const old = _lotteryList;
      _lotteryList = Array.isArray(list) ? list : [];
      _notify('lotteryList', { old, new: _lotteryList });
    }
  };
})();

// 掛載到 window
window.AppState = AppState;

console.log('📦 AppState 已載入');
