const STORAGE_KEY = 'pixelgrow_store'

const defaultState = {
  token: '',
  user: null,
  family: null,
  character: null,
}

let state = Object.assign({}, defaultState)
const listeners = []

function notify() {
  listeners.forEach((listener) => {
    try {
      listener(state)
    } catch (err) {
      console.error('[PixelGrow] Store listener error:', err)
    }
  })
}

function persist() {
  wx.setStorageSync(STORAGE_KEY, state)
}

function getState() {
  return state
}

function setState(patch) {
  state = Object.assign({}, state, patch)
  persist()
  notify()
  return state
}

function setAuthData(payload) {
  return setState({
    token: payload.token || '',
    user: payload.user || null,
    family: payload.family || null,
    character: payload.character || null,
  })
}

function clear() {
  state = Object.assign({}, defaultState)
  wx.removeStorageSync(STORAGE_KEY)
  notify()
  return state
}

function hydrateFromStorage() {
  const saved = wx.getStorageSync(STORAGE_KEY)
  if (!saved || typeof saved !== 'object') {
    return state
  }

  state = Object.assign({}, defaultState, saved)
  notify()
  return state
}

function subscribe(listener) {
  listeners.push(listener)
  return function unsubscribe() {
    const index = listeners.indexOf(listener)
    if (index >= 0) {
      listeners.splice(index, 1)
    }
  }
}

module.exports = {
  getState,
  setState,
  setAuthData,
  clear,
  hydrateFromStorage,
  subscribe,
}
