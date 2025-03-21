export const util = {
  formatTime(date) {
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    const hour = date.getHours()
    const minute = date.getMinutes()

    return `${[year, month, day].map(formatNumber).join('/')} ${[hour, minute].map(formatNumber).join(':')}`
  },

  formatNumber(n) {
    n = n.toString()
    return n[1] ? n : `0${n}`
  },

  showLoading(title = '加载中') {
    wx.showLoading({
      title,
      mask: true
    })
  },

  hideLoading() {
    wx.hideLoading()
  },

  showSuccess(title, duration = 1500) {
    wx.showToast({
      title,
      icon: 'success',
      duration
    })
  },

  showError(title, duration = 1500) {
    wx.showToast({
      title,
      icon: 'error',
      duration
    })
  },

  async checkPermission(scope) {
    try {
      const res = await wx.getSetting()
      if (res.authSetting[`scope.${scope}`] === false) {
        const confirmRes = await wx.showModal({
          title: '提示',
          content: '需要您授权才能使用该功能',
          confirmText: '去授权'
        })
        if (confirmRes.confirm) {
          await wx.openSetting()
        }
        return false
      }
      return true
    } catch (error) {
      console.error('检查权限失败:', error)
      return false
    }
  }
} 