export const constants = {
  // 提示语
  MESSAGES: {
    NETWORK_ERROR: '网络连接失败，请检查网络设置',
    SERVER_ERROR: '服务器异常，请稍后重试',
    AUTH_FAILED: '登录失败，请重新登录',
    SAVE_SUCCESS: '保存成功',
    DELETE_SUCCESS: '删除成功',
    OPERATION_FAILED: '操作失败，请重试'
  },

  // API错误码
  ERROR_CODES: {
    TOKEN_INVALID: 401,
    PERMISSION_DENIED: 403,
    NOT_FOUND: 404,
    SERVER_ERROR: 500
  },

  // 本地存储键名
  STORAGE_KEYS: {
    USER_INFO: 'userInfo',
    USER_ID: 'userId',
    TOKEN: 'token',
    REMINDERS: 'reminders'
  },

  // 页面路径
  PAGES: {
    INDEX: '/pages/index/index',
    SCAN: '/pages/scan/scan',
    FAVORITES: '/pages/favorites/favorites',
    REMINDER: '/pages/reminder/reminder',
    MEDICINE_DETAIL: '/pages/medicine-detail/medicine-detail'
  }
} 