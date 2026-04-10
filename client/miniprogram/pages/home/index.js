const app = getApp()

Page({
  data: {
    character: {
      name: '小小冒险家',
      level: 1,
      exp: 20,
      profession: '见习骑士',
    },
    pet: {
      name: '像素团子',
      level: 1,
      mood: 'happy',
      species: 'slime',
    },
    todayTasks: [
      {
        id: 'local-task-1',
        icon: '⭐',
        title: '领取今天的成长任务',
        status: 'PENDING',
        rewards: { exp: 10, coins: 8 },
      },
    ],
    expPercent: 20,
    nextLevelExp: 100,
    loading: false,
    errorMessage: '',
    completedCount: 0,
    totalCount: 1,
  },

  onLoad() {
    this.loadHomeSummary()
  },

  onShow() {
    this.loadHomeSummary()
  },

  onPullDownRefresh() {
    this.loadHomeSummary(true)
  },

  async loadHomeSummary(byPullDown = false) {
    this.setData({
      loading: true,
      errorMessage: '',
    })

    try {
      const serverUrl = app.globalData.serverUrl || 'http://localhost:3000'
      const response = await this.request({
        url: `${serverUrl}/api/home/summary`,
        method: 'GET',
      })

      const todayTasks = response.todayTasks || []
      const completedCount = todayTasks.filter(
        (task) => task.status === 'COMPLETED',
      ).length

      this.setData({
        character: response.character || this.data.character,
        pet: response.pet || this.data.pet,
        todayTasks,
        expPercent: response.expPercent || 0,
        nextLevelExp: response.nextLevelExp || 100,
        completedCount,
        totalCount: todayTasks.length,
      })
    } catch (error) {
      console.error('[Home] load summary failed:', error)
      this.setData({
        errorMessage: '加载失败，已显示本地缓存内容',
      })
      wx.showToast({
        title: '首页数据加载失败',
        icon: 'none',
      })
    } finally {
      this.setData({ loading: false })
      if (byPullDown) {
        wx.stopPullDownRefresh()
      }
    }
  },

  request(options) {
    return new Promise((resolve, reject) => {
      wx.request({
        ...options,
        success: (res) => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(res.data || {})
            return
          }
          reject(new Error(`HTTP_${res.statusCode}`))
        },
        fail: (err) => reject(err),
      })
    })
  },

  onNfcCheckin() {
    wx.showToast({ title: 'NFC Check-in', icon: 'none' })
    // TODO: NFC reading via ESP32 BLE
  },

  onStartAdventure() {
    wx.navigateTo({ url: '/pages/world/index' })
  },

  onCreateWork() {
    wx.navigateTo({ url: '/pages/creative/index' })
  },
})
