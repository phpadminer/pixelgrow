function isGuestSession(session) {
  return !session || !session.token
}

function applyGuestCompletion(completions, itemKey, completed, options = {}) {
  return Object.assign({}, completions || {}, {
    [itemKey]: {
      completed: Boolean(completed),
      status: 'confirmed',
      pointsDelta: 0,
      isMakeup: Boolean(options.isMakeup),
    },
  })
}

module.exports = {
  isGuestSession,
  applyGuestCompletion,
}
