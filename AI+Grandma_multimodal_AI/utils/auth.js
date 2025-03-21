export const auth = {
  async checkSession() {
    try {
      await wx.checkSession()
      return true
    } catch (error) {
      return false
    }
  },

  async login() {
    try {
      const { code } = await wx.login()
      // 这里可以调用后端接口进行登录验证
      return code
    } catch (error) {
      console.error('登录失败:', error)
      throw error
    }
  },

  async getUserInfo() {
    try {
      const userInfo = wx.getStorageSync('userInfo')
      if (userInfo) {
        return userInfo
      }
      return null
    } catch (error) {
      console.error('获取用户信息失败:', error)
      return null
    }
  },

  setUserInfo(userInfo) {
    try {
      wx.setStorageSync('userInfo', userInfo)
      wx.setStorageSync('userId', userInfo.openId || Date.now().toString())
    } catch (error) {
      console.error('保存用户信息失败:', error)
    }
  },

  clearUserInfo() {
    try {
      wx.removeStorageSync('userInfo')
      wx.removeStorageSync('userId')
    } catch (error) {
      console.error('清除用户信息失败:', error)
    }
  }
} 