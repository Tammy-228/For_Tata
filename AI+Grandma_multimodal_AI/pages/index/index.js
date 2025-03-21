import { env } from '../../utils/env'
import { config } from '../../utils/config'
import { dbService } from '../../utils/db'

const { ZHIPU_API, GEMINI_API } = config

Page({
  data: {
    userInfo: null,
    hasUserInfo: false,
    canIUseGetUserProfile: false
  },

  onLoad() {
    if (wx.getUserProfile) {
      this.setData({
        canIUseGetUserProfile: true
      })
    }
    
    // 检查是否已经授权
    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo) {
      this.setData({
        userInfo,
        hasUserInfo: true
      })
    }
  },

  getUserProfile() {
    const app = getApp()
    app.getUserProfile().then(userInfo => {
      this.setData({
        userInfo: userInfo,
        hasUserInfo: true
      })
      // 登录成功后初始化数据库连接
      dbService.init(userInfo)
    }).catch(err => {
      console.error('获取用户信息失败：', err)
      wx.showToast({
        title: '登录失败',
        icon: 'none'
      })
    })
  },

  // 退出登录
  logout() {
    const app = getApp()
    app.logout()
    this.setData({
      userInfo: null,
      hasUserInfo: false
    })
    // 清除数据库连接
    dbService.clear()
  },

  goToScan() {
    wx.navigateTo({
      url: '/pages/scan/scan'
    })
  },

  goToFavorites() {
    wx.navigateTo({
      url: '/pages/favorites/favorites'
    })
  },

  goToReminders() {
    wx.navigateTo({
      url: '/pages/reminder/reminder'
    })
  },

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  async makeRequest() {
    return new Promise((resolve, reject) => {
      wx.request({
        url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyAFmxUmSHr-OCvLKx_TR2hvNAU7hWl8wkg',
        method: 'POST',
        timeout: 30000,
        header: {
          'Content-Type': 'application/json'
        },
        data: {
          contents: [
            {
              parts: [
                {
                  text: "你好，你是谁？"
                }
              ]
            }
          ]
        },
        success: (res) => {
          if (res.statusCode === 429) {
            reject(new Error('RATE_LIMIT'));
          } else if (res.statusCode === 400) {
            reject(new Error(`BAD_REQUEST: ${res.data.error || '请求参数错误'}`));
          } else if (res.statusCode === 401) {
            reject(new Error('认证失败，请检查 API Key'));
          } else {
            resolve(res);
          }
        },
        fail: (err) => {
          reject(new Error('REQUEST_FAILED'));
        }
      });
    });
  },

  async retryRequest(maxRetries = 3, initialDelay = 3000) {
    let retries = 0;
    let delay = initialDelay;

    while (retries < maxRetries) {
      try {
        const response = await this.makeRequest();
        return response;
      } catch (error) {
        retries++;
        console.log(`第 ${retries} 次重试，等待 ${delay/1000} 秒...`);
        
        if (error.message.startsWith('BAD_REQUEST')) {
          throw error;
        }
        
        if (error.message === 'RATE_LIMIT') {
          if (retries === maxRetries) {
            throw new Error('频率限制，请稍后再试');
          }
          await this.sleep(delay);
          delay *= 2;
          continue;
        }
        
        if (retries === maxRetries) {
          throw new Error('请求失败，请检查网络');
        }
        await this.sleep(1000);
      }
    }
  },

  async testAPI() {
    try {
      wx.showLoading({
        title: '测试中...',
        mask: true
      });

      const response = await this.retryRequest();
      console.log('API响应:', response);

      if (response && response.statusCode === 200) {
        let result = '';
        if (response.data && response.data.candidates && response.data.candidates[0]) {
          result = response.data.candidates[0].content.parts[0].text;
        }
        wx.showToast({
          title: result || '测试成功',
          icon: 'success'
        });
        wx.showModal({
          title: '测试成功',
          content: result || '无回复内容',
          confirmText: '确定',
          showCancel: false
        });
        console.log('Gemini回复:', result);
      } else {
        throw new Error(`请求失败: ${response ? response.statusCode : 'unknown'}`);
      }
    } catch (error) {
      console.error('API测试失败:', error);
      wx.showToast({
        title: error.message || '未知错误',
        icon: 'none',
        duration: 3000
      });
    } finally {
      wx.hideLoading();
    }
  },

  async testVisionAPI() {
    try {
      wx.showLoading({
        title: '测试中...',
        mask: true
      });

      // 重试相关参数
      const maxRetries = 3;
      let retries = 0;
      let delay = 2000;

      // 选择图片
      const res = await wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: ['album']
      });

      // 转换图片为 base64
      const imageBase64 = await new Promise((resolve, reject) => {
        wx.getFileSystemManager().readFile({
          filePath: res.tempFiles[0].tempFilePath,
          encoding: 'base64',
          success: res => resolve(res.data),
          fail: err => reject(err)
        });
      });

      // 创建请求函数
      const makeVisionRequest = async () => {
        return new Promise((resolve, reject) => {
          wx.request({
            url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API.API_KEY}`,
            method: 'POST',
            header: {
              'Content-Type': 'application/json'
            },
            data: {
              contents: [
                {
                  parts: [
                    {
                      text: "What's in the picture"
                    },
                    {
                      inlineData: {
                        mimeType: "image/jpeg",
                        data: imageBase64
                      }
                    }
                  ]
                }
              ]
            },
            success: (res) => {
              if (res.statusCode === 429) {
                reject(new Error('RATE_LIMIT'));
              } else if (res.statusCode === 200) {
                resolve(res);
              } else {
                reject(new Error(`API返回错误状态码: ${res.statusCode}`));
              }
            },
            fail: (err) => {
              reject(new Error(err.errMsg || '请求失败'));
            }
          });
        });
      };

      // 执行请求（带重试）
      let response;
      while (retries < maxRetries) {
        try {
          response = await makeVisionRequest();
          break; // 如果成功就跳出循环
        } catch (error) {
          retries++;
          console.log(`第 ${retries} 次重试，等待 ${delay/1000} 秒...`);
          
          if (error.message === 'RATE_LIMIT') {
            if (retries === maxRetries) {
              throw new Error('频率限制，请稍后再试');
            }
            await this.sleep(delay);
            delay *= 2; // 指数退避
            continue;
          }
          
          if (retries === maxRetries) {
            throw error;
          }
          await this.sleep(1000);
        }
      }

      console.log('视觉API响应:', response);

      if (response.data) {
        let result = '';
        if (response.data && response.data.candidates) {
          if (response.data.candidates[0] && response.data.candidates[0].content) {
            result = response.data.candidates[0].content.parts[0].text;
          }
        }
        wx.showModal({
          title: '测试成功',
          content: result || '无识别结果',
          confirmText: '确定',
          showCancel: false
        });
        console.log('视觉识别结果:', result);
      } else {
        throw new Error('API返回数据格式错误');
      }
    } catch (error) {
      console.error('视觉API测试失败:', error);
      wx.showToast({
        title: error.message === 'RATE_LIMIT' ? 
          '请求频率限制，请稍后再试' : 
          (error.message || '识别失败，请重试'),
        icon: 'none',
        duration: 3000
      });
    } finally {
      wx.hideLoading();
    }
  }
}) 