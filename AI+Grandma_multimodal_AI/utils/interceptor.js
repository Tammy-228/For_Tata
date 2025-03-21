import { constants } from './constants'
import { auth } from './auth'

const originalRequest = wx.request
const originalUploadFile = wx.uploadFile

// 请求拦截器
wx.request = function(options) {
  const token = wx.getStorageSync('token')
  const header = {
    ...options.header,
    'Authorization': token ? `Bearer ${token}` : ''
  }

  return originalRequest({
    ...options,
    header,
    success: async (res) => {
      if (res.statusCode === constants.ERROR_CODES.TOKEN_INVALID) {
        // token失效，重新登录
        await handleTokenInvalid()
        // 重试请求
        wx.request(options)
        return
      }
      options.success && options.success(res)
    },
    fail: (err) => {
      console.error('请求失败:', err)
      wx.showToast({
        title: constants.MESSAGES.NETWORK_ERROR,
        icon: 'none'
      })
      options.fail && options.fail(err)
    }
  })
}

// 上传文件拦截器
wx.uploadFile = function(options) {
  const token = wx.getStorageSync('token')
  const header = {
    ...options.header,
    'Authorization': token ? `Bearer ${token}` : ''
  }

  return originalUploadFile({
    ...options,
    header,
    success: async (res) => {
      if (res.statusCode === constants.ERROR_CODES.TOKEN_INVALID) {
        await handleTokenInvalid()
        wx.uploadFile(options)
        return
      }
      options.success && options.success(res)
    },
    fail: (err) => {
      console.error('上传失败:', err)
      wx.showToast({
        title: constants.MESSAGES.NETWORK_ERROR,
        icon: 'none'
      })
      options.fail && options.fail(err)
    }
  })
}

async function handleTokenInvalid() {
  try {
    auth.clearUserInfo()
    const app = getApp()
    app.globalData.hasLogin = false
    await auth.login()
  } catch (error) {
    console.error('重新登录失败:', error)
    wx.showToast({
      title: constants.MESSAGES.AUTH_FAILED,
      icon: 'none'
    })
  }
} 