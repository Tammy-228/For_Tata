import { auth } from './utils/auth'
import { cloud } from './utils/cloud'

App({
  globalData: {
    userInfo: null,
    hasUserInfo: false
  },

  onLaunch() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        env: 'cloud1-6gjczjy14810d4c0', 
        traceUser: true,
      });
    }
    
    // 检查登录状态
    this.checkLoginStatus()
    // 尝试从本地存储恢复用户信息
    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo) {
      this.globalData.userInfo = userInfo
      this.globalData.hasUserInfo = true
    }
  },

  async checkLoginStatus() {
    const sessionValid = await auth.checkSession()
    if (!sessionValid) {
      try {
        await auth.login()
      } catch (error) {
        console.error('登录失败:', error)
      }
    }

    const userInfo = await auth.getUserInfo()
    if (userInfo) {
      this.globalData.userInfo = userInfo
      this.globalData.hasUserInfo = true
    }
  },

  // 获取用户信息
  getUserProfile() {
    return new Promise((resolve, reject) => {
      wx.getUserProfile({
        desc: '用于完善会员资料',
        success: async (res) => {
          // 获取openId
          try {
            const loginResult = await wx.cloud.callFunction({
              name: 'login'
            });
            
            const userInfo = {
              ...res.userInfo,
              openId: loginResult.result.openid
            };
            
            this.globalData.userInfo = userInfo;
            this.globalData.hasUserInfo = true;
            // 保存到本地存储
            wx.setStorageSync('userInfo', userInfo);
            resolve(userInfo);
          } catch (error) {
            console.error('获取openId失败:', error);
            reject(error);
          }
        },
        fail: (err) => {
          reject(err);
        }
      });
    });
  },

  // 退出登录
  logout() {
    this.globalData.userInfo = null
    this.globalData.hasUserInfo = false
    // 清除本地存储
    wx.removeStorageSync('userInfo')
  }
}) 