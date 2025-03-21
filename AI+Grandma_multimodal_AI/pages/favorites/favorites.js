import { dbService } from '../../utils/db'
import { geminiAPI } from '../../utils/api'

Page({
  data: {
    favorites: [],
    hasUserInfo: false,
    userInfo: null,
    currentMedicine: null
  },

  onLoad: function() {
    // 检查用户登录状态
    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo) {
      this.setData({
        hasUserInfo: true,
        userInfo: userInfo
      })
      this.loadFavorites()
    } else {
      wx.showToast({
        title: '请先登录',
        icon: 'none',
        duration: 2000
      })
      // 延迟跳转回首页
      setTimeout(() => {
        wx.switchTab({
          url: '/pages/index/index'
        })
      }, 2000)
    }
  },

  onShow: function() {
    // 每次页面显示时检查登录状态
    const userInfo = wx.getStorageSync('userInfo')
    if (!userInfo && this.data.hasUserInfo) {
      this.setData({
        hasUserInfo: false,
        userInfo: null,
        favorites: []
      })
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      wx.switchTab({
        url: '/pages/index/index'
      })
    }
  },

  loadFavorites: function() {
    if (!this.data.hasUserInfo) return;
    
    wx.showLoading({
      title: '加载中...'
    });
    
    dbService.getFavorites().then(result => {
      console.log('原始数据:', result.data);
      // 格式化时间和处理数据
      const favorites = result.data.map(item => {
        console.log('处理单个项目:', item);
        return {
          _id: item._id,
          name: item.name || '未命名',
          createTime: new Date(item.createTime).toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          }).replace(/\//g, '-'),
          chatMessages: item.chatMessages || [],
          translation: item.translation || '',
          imageUrl: item.imageUrl?.startsWith('data:') 
            ? item.imageUrl 
            : (item.imageUrl || ''),
        };
      });
      
      console.log('处理后的数据:', favorites);
      this.setData({ favorites });
      wx.hideLoading();
    }).catch(error => {
      console.error('加载收藏失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
      wx.hideLoading();
    });
  },

  // 播放文本
  playText: function(e) {
    const text = e.currentTarget.dataset.text;
    if (!text) {
      wx.showToast({
        title: '没有可播放的内容',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({ title: '准备播放...' });
    
    geminiAPI.textToSpeech(text).then(audioPath => {
      const audioContext = wx.createInnerAudioContext();
      audioContext.src = audioPath;
      audioContext.play();
      wx.hideLoading();
    }).catch(error => {
      console.error('播放失败:', error);
      wx.showToast({
        title: '播放失败',
        icon: 'none'
      });
      wx.hideLoading();
    });
  },

  // 删除收藏
  deleteFavorite: function(e) {
    if (!this.data.hasUserInfo) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return;
    }

    const id = e.currentTarget.dataset.id;
    
    dbService.deleteFavorite(id).then(() => {
      this.loadFavorites(); // 重新加载列表
      wx.showToast({
        title: '删除成功',
        icon: 'success'
      });
    }).catch(error => {
      wx.showToast({
        title: '删除失败',
        icon: 'none'
      });
    });
  },

  // 跳转到扫描页面
  goToScan: function() {
    wx.navigateTo({
      url: '/pages/scan/scan'
    });
  },

  viewDetail(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/medicine-detail/medicine-detail?id=${id}`
    })
  },

  // 预览图片
  previewImage(e) {
    const url = e.currentTarget.dataset.url;
    if (url) {
      wx.previewImage({
        urls: [url],
        current: url
      });
    }
  },

  // 处理图片加载错误
  handleImageError(e) {
    const { index } = e.currentTarget.dataset;
    console.error('图片加载失败:', this.data.favorites[index].imageUrl);
  }
}) 