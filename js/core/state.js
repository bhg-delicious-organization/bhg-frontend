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
  let _todayStatus = 'closed'; // 'open' 或 'closed'
  let _userDataCache = null;

  // 觀察者列表
  let _observers = {
    admin: [],
    page: [],
    studentId: [],
    adminMode: [],
    restaurant: [],
    todayStatus: [], // 新增
    userData: []
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
    todayStatus: () => _todayStatus,
    getUserData: (studentId) => {
      if (studentId && studentId !== _currentStudentId) return null;
      return _userDataCache;
    },

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
      if (old !== id) {
        _userDataCache = null;
        _notify('userData', null);
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

    setTodayStatus: function(status) {
      const old = _todayStatus;
      _todayStatus = status;
      _notify('todayStatus', { old, new: status });
    },

    setUserData: function(studentId, data) {
      if (studentId !== _currentStudentId) {
        console.warn('setUserData: studentId 不符，忽略', studentId, _currentStudentId);
        return;
      }
      _userDataCache = data;
      _notify('userData', data);
    },

    clearUserData: function() {
      _userDataCache = null;
      _notify('userData', null);
    },

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
      this.clearUserData();
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
        todayStatus: _todayStatus,
        userData: _userDataCache
      };
    }
  };
})();

window.AppState = AppState;

console.log('📦 AppState 已載入');
