import { dbService } from '../../utils/db'
import { geminiAPI } from '../../utils/api'
import { zhipuAPI } from '../../utils/api'

Page({
  data: {
    scanResult: null,
    translation: null,
    audioUrl: null,
    isPlaying: false,
    isSaved: false,
    currentMedicine: null,
    tempImagePath: null,
    processing: false,
    showCamera: true,
    recognizedText: '',
    showResult: false,
    chatMessages: [],
    inputMessage: '',
    lastMessageId: ''
  },

  // 拍照功能
  async takePhoto() {
    try {
      wx.showLoading({
        title: '拍照中...',
        mask: true
      });

      const ctx = wx.createCameraContext()
      const photo = await new Promise((resolve, reject) => {
        ctx.takePhoto({
          quality: 'high',
          success: (res) => resolve(res),
          fail: (err) => reject(err)
        })
      })

      this.setData({
        tempImagePath: photo.tempImagePath
      });
      
      wx.showToast({
        title: '拍照成功',
        icon: 'success'
      });

    } catch (error) {
      console.error('拍照失败:', error)
      wx.showToast({
        title: '拍照失败，请重试',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
  },

  // OCR识别和翻译
  async processImage() {
    if (!this.data.tempImagePath) {
      wx.showToast({
        title: '请先拍照',
        icon: 'none'
      });
      return;
    }

    try {
      wx.showLoading({
        title: '正在识别...',
        mask: true
      });

      this.setData({ 
        processing: true,
        showCamera: false
      });

      // 转换图片为 base64
      const imageBase64 = await new Promise((resolve, reject) => {
        wx.getFileSystemManager().readFile({
          filePath: this.data.tempImagePath,
          encoding: 'base64',
          success: res => resolve(res.data),
          fail: err => reject(err)
        })
      })

      // 调用 OCR 识别
      const ocrResult = await geminiAPI.recognizeImage(imageBase64)
      
      this.setData({
        recognizedText: ocrResult.choices[0].message.content,
        showResult: true
      });
      
      // 获取翻译和解释
      const translation = await geminiAPI.translateAndExplain(
        ocrResult.choices[0].message.content, 
        'instruction'
      )
      
      this.setData({
        scanResult: ocrResult,
        translation: translation.choices[0].message.content,
        audioUrl: translation.audio_url,
        processing: false
      })
    } catch (error) {
      console.error('处理失败:', error)
      wx.showToast({
        title: error.message || '识别失败，请重试',
        icon: 'none',
        duration: 3000
      })
      this.setData({ 
        processing: false,
        showCamera: true,
        showResult: false
      })
    } finally {
      wx.hideLoading()
    }
  },

  // 播放语音
  playAudio() {
    if (!this.data.audioUrl) return
    
    const audioContext = wx.createInnerAudioContext()
    audioContext.src = this.data.audioUrl
    audioContext.play()
    
    this.setData({ isPlaying: true })
    
    audioContext.onEnded(() => {
      this.setData({ isPlaying: false })
    })
  },

  // 保存到收藏
  async saveToFavorites() {
    try {
      if (this.data.isSaved) {
        wx.showToast({
          title: '已经收藏过了',
          icon: 'none'
        });
        return;
      }

      wx.showLoading({
        title: '保存中...',
        mask: true
      });

      console.log('开始保存收藏...');
      // 构建完整的对话内容
      const fullChatMessages = [
        ...(this.data.translation ? [{
          content: this.data.translation,
          type: 'ai', 
          timestamp: new Date(),
          id: 'translation_result'
        }] : []),
        ...this.data.chatMessages
      ];

      const medicineData = {
        name: '药品说明书对话',
        chatMessages: fullChatMessages,
        translation: this.data.translation,
        imageUrl: this.data.tempImagePath,
        createTime: new Date()
      };

      console.log('准备保存的数据:', medicineData);
      await dbService.saveMedicine(medicineData);
      console.log('保存成功');

      this.setData({
        isSaved: true
      });

      wx.showToast({
        title: '收藏成功',
        icon: 'success'
      });
    } catch (error) {
      console.error('收藏失败:', error);
      wx.showToast({
        title: '收藏失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  // 将图片转换为base64
  async getBase64Image(filePath) {
    try {
      const res = await new Promise((resolve, reject) => {
        wx.getFileSystemManager().readFile({
          filePath: filePath,
          encoding: 'base64',
          success: res => resolve(res.data),
          fail: err => reject(err)
        });
      });
      return 'data:image/png;base64,' + res;
    } catch (error) {
      console.error('转换base64失败:', error);
      return '';
    }
  },

  // 添加到提醒列表的异步方法
  async addToReminder() {
    try {
      const reminders = wx.getStorageSync('reminders') || [];
      
      // 先上传图片到云存储
      let imageUrl = '';
      if (this.data.tempImagePath) {
        try {
          const uploadResult = await wx.cloud.uploadFile({
            cloudPath: `reminder_images/${Date.now()}.png`,
            filePath: this.data.tempImagePath
          });
          imageUrl = uploadResult.fileID;
        } catch (error) {
          console.error('图片上传失败:', error);
        }
      }

      this.setData({
        showResult: true
      });
      
      // 使用识别的原始文本和翻译结果
      const extractedtext = this.data.translation || '';
      const text = `原文：${this.data.recognizedText || ''}\n\n翻译：${this.data.translation || ''}`;

      // 调用API解析药品名称
      const filteredName = await geminiAPI.translateAndExplain(
        text, 
        'name'
      );
      // 调用API解析用药剂量
      const filteredDosage = await geminiAPI.translateAndExplain(
        text,
        'dosage'
      );
      // 调用API解析服用频次
      const filteredFrequency = await geminiAPI.translateAndExplain(
        text,
        'frequency'
      );
      // 将频次转换为数字,默认为1
      const frequency = parseInt(filteredFrequency) || 1;
      // 初始化服用时间数组
      let times = [];
      // 根据频次设置默认的服用时间
      if (frequency === 1) {
        times = ['08:00'];  // 一日一次
      } else if (frequency === 2) {
        times = ['08:00', '20:00'];  // 一日两次
      } else if (frequency === 3) {
        times = ['08:00', '14:00', '20:00'];  // 一日三次
      } else {
        times = ['08:00'];  // 其他情况默认一次
      }
      
      // 构建新的提醒对象
      const newReminder = {
        id: Date.now().toString(),
        medicineName: filteredName.choices[0].message.content,
        frequency: frequency,
        times: times,
        dosage: filteredDosage.choices[0].message.content,
        createTime: new Date(),
        content: extractedtext,
        imageUrl: imageUrl
      };
      
      // 将新提醒添加到列表中
      reminders.push(newReminder);
      // 保存更新后的提醒列表到本地存储
      await wx.setStorageSync('reminders', reminders);
      
      // 显示添加成功的提示
      wx.showToast({
        title: '已添加到提醒',
        icon: 'success'
      });
      
    } catch (error) {
      // 打印错误信息到控制台
      console.error('添加提醒失败:', error);
      // 显示添加失败的提示
      wx.showToast({
        title: '添加失败',
        icon: 'none'
      });
    }
  },

  // 处理输入变化
  onInputChange(e) {
    this.setData({
      inputMessage: e.detail.value
    });
  },

  // 发送消息
  async sendMessage() {
    if (!this.data.inputMessage.trim()) return;

    const messageId = Date.now().toString();
    const userMessage = {
      id: messageId,
      content: this.data.inputMessage,
      type: 'user'
    };

    this.setData({
      chatMessages: this.data.chatMessages.concat([userMessage]),
      inputMessage: '',
      lastMessageId: messageId
    });

    try {
      wx.showLoading({ title: '思考中...' });
      
      const prompt = 'Context: I just scanned an image with this content: ' + this.data.recognizedText + '\n' +
        'The explanation is: ' + this.data.translation + '\n\n' +
        'User question: ' + userMessage.content + '\n\n' +
        'Please answer the user\'s question directly based on the image content and explanation above.\n' +
        'Focus only on the specific question and provide a clear, relevant answer.';
      
      // 打印完整的提示词
      console.log('发送给模型的提示词:', prompt);
      console.log('识别的文本:', this.data.recognizedText);
      console.log('翻译内容:', this.data.translation);
      console.log('用户问题:', userMessage.content);
      
      const response = await geminiAPI.chat(prompt);
      console.log('AI原始回答:', response);
      
      if (!response || !response.choices || !response.choices[0] || 
          !response.choices[0].message || !response.choices[0].message.content) {
        throw new Error('AI回答格式不正确');
      }
      
      const translatedResponse = await geminiAPI.translateAndExplain(
        response.choices[0].message.content,
        'instruction'
      );
      console.log('翻译后回答:', translatedResponse);

      if (!translatedResponse || !translatedResponse.choices || !translatedResponse.choices[0] || 
          !translatedResponse.choices[0].message || !translatedResponse.choices[0].message.content) {
        throw new Error('翻译结果格式不正确');
      }

      const aiMessage = {
        id: Date.now().toString(),
        content: translatedResponse.choices[0].message.content,
        type: 'ai'
      };
      console.log('准备添加到对话:', aiMessage);

      this.setData({
        chatMessages: this.data.chatMessages.concat([aiMessage])
      });
    } catch (error) {
      console.error('发送消息失败:', error);
      wx.showToast({
        title: '发送消息失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  // 播放文本
  async playText(e) {
    try {
      const text = e.currentTarget.dataset.text;
      if (!text) return;
      
      wx.showLoading({
        title: '准备播放...',
        mask: true
      });

      // 调用 Gemini 的语音合成 API
      const audioData = await geminiAPI.textToSpeech(text);
      
      const audioContext = wx.createInnerAudioContext();
      audioContext.src = audioData;
      audioContext.play();
      
      audioContext.onPlay(() => {
        wx.hideLoading();
        console.log('开始播放音频');
      });
      
      audioContext.onError((err) => {
        console.error('音频播放失败:', err);
        wx.showToast({
          title: '播放失败',
          icon: 'none'
        });
      });
      
      audioContext.onEnded(() => {
        console.log('音频播放结束');
      });
      
    } catch (error) {
      console.error('语音播放失败:', error);
      wx.showToast({
        title: '语音生成失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  // 重新开始扫描
  restartScan() {
    this.setData({
      showCamera: true,
      showResult: false,
      tempImagePath: null,
      recognizedText: '',
      translation: null,
      chatMessages: [],
      inputMessage: ''
    });
  }
}) 