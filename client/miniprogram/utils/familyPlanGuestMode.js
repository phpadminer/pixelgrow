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

function addGuestTask(tasks, payload) {
  return (tasks || []).concat({
    id: payload.id,
    childId: payload.childId,
    title: payload.title,
    dueDate: payload.dueDate,
    time: payload.time,
    meta: '临时任务',
    focusMode: payload.focusMode || 'pomodoro',
    focusMinutes: Number(payload.focusMinutes || 25),
    breakMinutes: Number(payload.breakMinutes || 5),
    successPoints: Number(payload.successPoints || 0),
    failurePoints: Number(payload.failurePoints || 0),
    allowMakeup: payload.allowMakeup !== false,
    makeupPoints: Number(payload.makeupPoints || 0),
    successRule: payload.successRule || '体验完成',
    makeupRule: payload.makeupRule || '体验补卡',
    failureRule: payload.failureRule || '体验复盘',
  })
}

module.exports = {
  addGuestTask,
  isGuestSession,
  applyGuestCompletion,
}
