import { constants } from './constants'

export const cloudError = {
  handleError(error, customMessage) {
    console.error(error)
    
    let message = customMessage || constants.MESSAGES.OPERATION_FAILED
    
    if (error.errCode) {
      switch (error.errCode) {
        case -404:
          message = '请求的资源不存在'
          break
        case -501:
          message = '数据库操作失败'
          break
        case -502:
          message = '云函数执行失败'
          break
        case -601:
          message = '云存储操作失败'
          break
        case -602:
          message = '文件不存在'
          break
        default:
          if (error.errMsg) {
            message = error.errMsg
          }
      }
    }

    wx.showToast({
      title: message,
      icon: 'none',
      duration: 2000
    })

    return {
      success: false,
      error: message
    }
  },

  async handleTransaction(callback) {
    const db = wx.cloud.database()
    try {
      await db.startTransaction()
      const result = await callback(db)
      await db.commitTransaction()
      return result
    } catch (error) {
      await db.rollbackTransaction()
      throw error
    }
  }
} 