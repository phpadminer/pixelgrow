const request = require('./utils/request')
const store = require('./utils/store')

App({
  globalData: {
    userInfo: null,
    familyId: null,
    character: null,
    serverUrl: 'http://localhost:3000',
  },

  onLaunch() {
    const cachedState = store.hydrateFromStorage()
    this.syncGlobalData(cachedState)
    store.subscribe((nextState) => {
      this.syncGlobalData(nextState)
    })
    this.checkLogin()
  },

  syncGlobalData(state) {
    this.globalData.userInfo = state.user
    this.globalData.familyId = state.family && state.family.id ? state.family.id : null
    this.globalData.character = state.character
  },

  async checkLogin() {
    const cachedToken = wx.getStorageSync('token')
    if (cachedToken) {
      request.setToken(cachedToken)
    }

    try {
      const loginRes = await wx.login()
      if (!loginRes.code) {
        throw new Error('wx.login did not return code')
      }

      const authData = await request.post('/auth/wechat/login', { code: loginRes.code })
      const token = authData.token || authData.accessToken || authData.jwt || ''

      if (!token) {
        throw new Error('backend did not return JWT token')
      }

      request.setToken(token)

      const nextState = store.setAuthData({
        token,
        user: authData.user || authData.userInfo || null,
        family: authData.family || null,
        character: authData.character || authData.role || null,
      })

      this.syncGlobalData(nextState)
      console.log('[PixelGrow] Login success')
    } catch (err) {
      console.error('[PixelGrow] Login failed:', err)
    }
  },
})
