Page({
  data: {
    reminders: [],
    today: '',
    showDetail: false,
    currentItem: null
  },

  onLoad() {
    this.setToday()
    this.loadReminders()
  },

  onShow() {
    this.loadReminders() // 每次显示页面时重新加载
  },

  setToday() {
    const date = new Date()
    const today = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    this.setData({ today })
  },

  async loadReminders() {
    try {
      // 从本地存储中获取提醒列表,如果不存在则返回空数组
      // reminders数据来自scan.js中addToReminder()方法保存的数据
      let reminders = wx.getStorageSync('reminders') || []
      
      // 从本地存储中获取上次重置的日期
      const lastResetDate = wx.getStorageSync('lastResetDate')
      // 获取今天的日期字符串,格式如: "Wed Jan 17 2024"
      const today = new Date().toDateString()
      
      // 如果上次重置日期不是今天,说明需要重置状态
      if (lastResetDate !== today) {
        // 遍历所有提醒项,重置completed状态为false
        // 使用map创建新数组,保持其他属性不变
        reminders = reminders.map(item => ({
          ...item,
          completed: false
        }))
        // 将重置后的提醒列表保存回本地存储
        wx.setStorageSync('reminders', reminders)
        // 更新最后重置日期为今天
        wx.setStorageSync('lastResetDate', today)
      }
      
      // 更新页面数据,触发视图更新
      this.setData({ reminders })
    } catch (error) {
      // 打印错误日志
      console.error('加载清单失败:', error)
      // 显示加载失败的提示框
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  },

  async toggleItem(e) {
    const { id } = e.currentTarget.dataset
    try {
      const reminders = this.data.reminders.map(item => 
        item.id === id ? { ...item, completed: !item.completed } : item
      )
      
      await wx.setStorageSync('reminders', reminders)
      this.setData({ reminders })
      
      wx.showToast({
        title: '状态已更新',
        icon: 'success'
      })
    } catch (error) {
      console.error('更新状态失败:', error)
      wx.showToast({
        title: '更新失败',
        icon: 'none'
      })
    }
  },

  editDosage(e) {
    const { id } = e.currentTarget.dataset
    const item = this.data.reminders.find(r => r.id === id)
    
    wx.showModal({
      title: '设置每日用量',
      editable: true,
      placeholderText: '请输入数量',
      content: item.dosage || '',
      success: async (res) => {
        if (res.confirm && res.content) {
          try {
            const reminders = this.data.reminders.map(item =>
              item.id === id ? { ...item, dosage: res.content } : item
            )
            
            await wx.setStorageSync('reminders', reminders)
            this.setData({ reminders })
            
            wx.showToast({
              title: '设置成功',
              icon: 'success'
            })
          } catch (error) {
            console.error('设置用量失败:', error)
            wx.showToast({
              title: '设置失败',
              icon: 'none'
            })
          }
        }
      }
    })
  },

  async setupReminders(reminder) {
    try {
      const result = await wx.requestSubscribeMessage({
        tmplIds: ['your_template_id']
      })
      
      if (result['your_template_id'] === 'accept') {
        // 订阅成功，可以在这里调用云函数设置定时任务
        console.log('用户接受了消息订阅')
      }
    } catch (error) {
      console.error('设置提醒失败:', error)
    }
  },

  showDetail(e) {
    const { id } = e.currentTarget.dataset;
    const currentItem = this.data.reminders.find(item => item.id === id);
    this.setData({
      showDetail: true,
      currentItem
    });
  },

  hideDetail() {
    this.setData({
      showDetail: false,
      currentItem: null
    });
  },

  // 删除提醒项
  async deleteItem(e) {
    const { id } = e.currentTarget.dataset;
    
    try {
      // 显示确认对话框
      const res = await wx.showModal({
        title: '确认删除',
        content: '确定要删除这个提醒吗？',
        confirmColor: '#ff3b30'
      });
      
      if (res.confirm) {
        // 获取当前提醒列表
        const reminders = this.data.reminders;
        // 过滤掉要删除的项目
        const updatedReminders = reminders.filter(item => item.id !== id);
        
        // 更新本地存储
        await wx.setStorageSync('reminders', updatedReminders);
        
        // 更新页面数据
        this.setData({
          reminders: updatedReminders
        });
        
        wx.showToast({
          title: '删除成功',
          icon: 'success'
        });
      }
    } catch (error) {
      console.error('删除失败:', error);
      wx.showToast({
        title: '删除失败',
        icon: 'none'
      });
    }
  },

  // 预览图片
  previewImage(e) {
    const url = e.currentTarget.dataset.url || this.data.currentItem?.imageUrl;
    if (url) {
      wx.previewImage({
        urls: [url],
        current: url
      });
    }
  }
}) 