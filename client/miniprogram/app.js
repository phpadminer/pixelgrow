App({
  globalData: {
    userInfo: null,
    familyId: null,
    character: null,
    serverUrl: 'http://localhost:3000',
  },

  onLaunch() {
    this.checkLogin()
  },

  async checkLogin() {
    try {
      const res = await wx.login()
      // TODO: Send res.code to server for session
      console.log('[PixelGrow] Login code:', res.code)
    } catch (err) {
      console.error('[PixelGrow] Login failed:', err)
    }
  },
})
