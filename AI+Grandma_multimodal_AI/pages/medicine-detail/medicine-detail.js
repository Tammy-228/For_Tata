import { db } from '../../utils/db'
import { zhipuAPI } from '../../utils/api'

Page({
  data: {
    medicine: null,
    isPlaying: false,
    audioUrl: null
  },

  onLoad(options) {
    const { id } = options
    this.loadMedicineDetail(id)
  },

  async loadMedicineDetail(id) {
    try {
      const result = await db.getMedicineById(id)
      this.setData({ medicine: result.data })
    } catch (error) {
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  },

  async playAudio() {
    if (this.data.isPlaying) {
      this.stopAudio()
      return
    }

    try {
      if (!this.data.audioUrl) {
        const audioResult = await zhipuAPI.textToSpeech(this.data.medicine.translation)
        this.setData({ audioUrl: audioResult.audio_url })
      }

      const audioContext = wx.createInnerAudioContext()
      audioContext.src = this.data.audioUrl
      audioContext.play()
      
      this.setData({ isPlaying: true })
      
      audioContext.onEnded(() => {
        this.setData({ isPlaying: false })
      })
    } catch (error) {
      wx.showToast({
        title: '播放失败',
        icon: 'none'
      })
    }
  },

  stopAudio() {
    if (this.audioContext) {
      this.audioContext.stop()
      this.setData({ isPlaying: false })
    }
  },

  addReminder() {
    wx.navigateTo({
      url: `/pages/reminder/reminder?medicineId=${this.data.medicine._id}`
    })
  },

  viewUsageRecord() {
    wx.navigateTo({
      url: `/pages/usage-record/usage-record?id=${this.data.medicine._id}`
    })
  }
}) 