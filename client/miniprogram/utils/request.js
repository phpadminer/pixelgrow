const DEFAULT_SERVER_URL = 'http://localhost:3000'
let tokenCache = ''

function getServerUrl() {
  try {
    const app = getApp()
    if (app && app.globalData && app.globalData.serverUrl) {
      return app.globalData.serverUrl
    }
  } catch (err) {
    // getApp() can fail before App initialization.
  }
  return DEFAULT_SERVER_URL
}

function normalizeUrl(path) {
  if (/^https?:\/\//.test(path)) {
    return path
  }

  const serverUrl = getServerUrl().replace(/\/$/, '')
  const nextPath = path.charAt(0) === '/' ? path : `/${path}`
  return `${serverUrl}${nextPath}`
}

function setToken(token) {
  tokenCache = token || ''
  if (tokenCache) {
    wx.setStorageSync('token', tokenCache)
  } else {
    wx.removeStorageSync('token')
  }
}

function getToken() {
  if (tokenCache) {
    return tokenCache
  }

  const saved = wx.getStorageSync('token') || ''
  tokenCache = saved
  return tokenCache
}

function request(options) {
  const {
    url,
    method = 'GET',
    data = {},
    header = {},
    skipAuth = false,
    timeout = 10000,
  } = options

  const headers = Object.assign(
    {
      'content-type': 'application/json',
    },
    header
  )

  if (!skipAuth) {
    const token = getToken()
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }
  }

  return new Promise((resolve, reject) => {
    wx.request({
      url: normalizeUrl(url),
      method,
      data,
      header: headers,
      timeout,
      success(res) {
        const statusCode = res.statusCode || 0
        if (statusCode >= 200 && statusCode < 300) {
          resolve(res.data || {})
          return
        }

        const err = new Error(`Request failed: ${statusCode}`)
        err.statusCode = statusCode
        err.response = res.data
        reject(err)
      },
      fail(err) {
        reject(err)
      },
    })
  })
}

function get(url, data, options) {
  return request(Object.assign({ url, method: 'GET', data }, options))
}

function post(url, data, options) {
  return request(Object.assign({ url, method: 'POST', data }, options))
}

function put(url, data, options) {
  return request(Object.assign({ url, method: 'PUT', data }, options))
}

function del(url, data, options) {
  return request(Object.assign({ url, method: 'DELETE', data }, options))
}

module.exports = {
  request,
  get,
  post,
  put,
  del,
  setToken,
  getToken,
}
