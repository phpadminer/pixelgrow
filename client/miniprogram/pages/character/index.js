const app = getApp()

Page({
  data: {
    character: null,
  },

  onShow() {
    const localCharacter = wx.getStorageSync('pixelgrow_character')
    const character = app.globalData.character || localCharacter || null
    this.setData({ character })
  },

  onCreateCharacter() {
    wx.navigateTo({ url: '/pages/character/create' })
  },
})
