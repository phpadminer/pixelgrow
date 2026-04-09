const app = getApp()

Page({
  data: {
    character: {
      name: '',
      level: 1,
      exp: 0,
      profession: 'adventurer',
    },
    pet: {
      name: '',
      level: 1,
      mood: 'happy',
    },
    todayTasks: [],
    expPercent: 0,
    nextLevelExp: 100,
  },

  onLoad() {
    this.loadCharacter()
    this.loadTodayTasks()
  },

  onShow() {
    this.loadTodayTasks()
  },

  async loadCharacter() {
    // TODO: Fetch from server
    this.setData({
      character: {
        name: '小明',
        level: 5,
        exp: 340,
        profession: '音乐骑士',
      },
      pet: {
        name: '火小狐',
        level: 3,
        mood: 'happy',
      },
      expPercent: 68,
      nextLevelExp: 500,
    })
  },

  async loadTodayTasks() {
    // TODO: Fetch from server
    this.setData({
      todayTasks: [
        {
          id: '1',
          icon: '📚',
          title: '完成今日作业',
          rewards: { exp: 30, coins: 20 },
          status: 'PENDING',
        },
        {
          id: '2',
          icon: '🎵',
          title: '圆号练习 20 分钟',
          rewards: { exp: 40, coins: 25 },
          status: 'PENDING',
        },
        {
          id: '3',
          icon: '🏠',
          title: '整理书桌',
          rewards: { exp: 15, coins: 10 },
          status: 'COMPLETED',
        },
      ],
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
