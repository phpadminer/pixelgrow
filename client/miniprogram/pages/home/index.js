const app = getApp()

function getAppearanceLabel(appearance = {}) {
  const parts = [appearance.hairStyle, appearance.expression].filter(Boolean)
  return parts.length ? `外观: ${parts.join(' · ')}` : '见习骑士'
}

function getLocalCharacter() {
  const localCharacter = wx.getStorageSync('pixelgrow_character') || app.globalData.character
  if (!localCharacter) {
    return null
  }

  return {
    name: localCharacter.name || '小小冒险家',
    level: localCharacter.level || 1,
    exp: localCharacter.exp || 20,
    profession: getAppearanceLabel(localCharacter.appearance || {}),
  }
}

function normalizeTask(task) {
  const statusMeta = {
    COMPLETED: { statusClass: 'status-completed', statusText: '已完成' },
    IN_PROGRESS: { statusClass: 'status-progress', statusText: '进行中' },
    PENDING: { statusClass: 'status-pending', statusText: '待完成' },
  }
  const meta = statusMeta[task.status] || statusMeta.PENDING

  return {
    ...task,
    rewardExp: task.rewardExp ?? task.rewards?.exp ?? 0,
    rewardCoins: task.rewardCoins ?? task.rewards?.coins ?? 0,
    ...meta,
  }
}

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
        rewardExp: 10,
        rewardCoins: 8,
        statusClass: 'status-pending',
        statusText: '待完成',
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
    const localCharacter = getLocalCharacter()
    this.setData({
      loading: true,
      errorMessage: '',
      character: localCharacter || this.data.character,
    })

    try {
      const serverUrl = app.globalData.serverUrl || 'http://localhost:3000'
      const response = await this.request({
        url: `${serverUrl}/api/home/summary`,
        method: 'GET',
      })

      const todayTasks = (response.todayTasks || []).map(normalizeTask)
      const completedCount = todayTasks.filter(
        (task) => task.status === 'COMPLETED',
      ).length

      this.setData({
        character: response.character || localCharacter || this.data.character,
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
        character: localCharacter || this.data.character,
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
