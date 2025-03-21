import { db } from '../../utils/db'
import { util } from '../../utils/util'

Page({
  data: {
    medicineId: '',
    medicine: null,
    records: [],
    statistics: {
      totalDays: 0,
      completionRate: 0,
      lastUsage: null
    }
  },

  onLoad(options) {
    const { id } = options
    this.setData({ medicineId: id })
    this.loadData()
  },

  async loadData() {
    try {
      util.showLoading()
      await Promise.all([
        this.loadMedicineInfo(),
        this.loadUsageRecords()
      ])
      this.calculateStatistics()
      util.hideLoading()
    } catch (error) {
      util.showError('加载失败')
    }
  },

  async loadMedicineInfo() {
    const result = await db.getMedicineById(this.data.medicineId)
    this.setData({ medicine: result.data })
  },

  async loadUsageRecords() {
    const result = await db.getUsageRecords(this.data.medicineId)
    this.setData({ records: result.data })
  },

  calculateStatistics() {
    const { records } = this.data
    if (!records.length) return

    // 计算总天数
    const firstRecord = records[records.length - 1]
    const lastRecord = records[0]
    const totalDays = Math.ceil(
      (lastRecord.createTime - firstRecord.createTime) / (24 * 60 * 60 * 1000)
    )

    // 计算完成率
    const completedRecords = records.filter(r => r.status === 'completed')
    const completionRate = Math.round((completedRecords.length / records.length) * 100)

    this.setData({
      statistics: {
        totalDays,
        completionRate,
        lastUsage: lastRecord.createTime
      }
    })
  },

  recordUsage() {
    wx.showModal({
      title: '记录用药',
      content: '确认已按计划服用药品？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await db.recordUsage(this.data.medicineId, this.data.medicine.dosage)
            util.showSuccess('记录成功')
            this.loadData()
          } catch (error) {
            util.showError('记录失败')
          }
        }
      }
    })
  }
}) 