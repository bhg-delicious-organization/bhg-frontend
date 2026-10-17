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
  let _userDataCache = null;   // ← 新增

  // 觀察者列表
  let _observers = {
    admin: [],
    page: [],
    studentId: [],
    adminMode: [],
    restaurant: [],
    userData: []   // ← 新增
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
    getUserData: () => _userDataCache,   // ← 新增

    // ========== Setters ==========
    setAdmin: function(value, token, csrfToken) {
      const old = _isAdmin;
      _isAdmin = value;
      _adminToken = token || null;
      _csrfToken = csrfToken || null;
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
        localStorage.setItem('currentStudentId', id);
      } else {
        localStorage.removeItem('currentStudentId');
      }
      _notify('studentId', { old, new: id });
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

    // ← 新增
    setUserData: function(data) {
      _userDataCache = data;
      _notify('userData', data);
    },

    // ← 新增
    clearUserData: function() {
      _userDataCache = null;
      _notify('userData', null);
    },

    /**
     * 初始化（只讀學生學號，管理員狀態由 Supabase Auth 判斷）
     */
    init: function() {
      const savedStudentId = localStorage.getItem('currentStudentId');
      if (savedStudentId) {
        _currentStudentId = savedStudentId;
      }
      return false;
    },

    logout: function() {
      this.setAdmin(false, null, null);
      this.setAdminMode(false);
      this.setCurrentStudentId('');
      this.clearUserData();   // ← 新增
    },

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
        currentRestaurantName: _currentRestaurantName,
        userData: _userDataCache   // ← 新增
      };
    }
  };
})();

window.AppState = AppState;

console.log('📦 AppState 已載入');
