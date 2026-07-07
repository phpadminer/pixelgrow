function getRewardSetting(item) {
  const successPoints = Number(item.successPoints || 0)
  const failurePoints = Number(item.failurePoints || 0)
  const allowMakeup = item.allowMakeup !== false
  const makeupPoints = Number(item.makeupPoints ?? Math.max(0, successPoints - 1))

  return {
    successPoints,
    failurePoints,
    allowMakeup,
    makeupPoints,
    successRule: item.successRule || '完成后获得积分',
    failureRule: item.failureRule || '未完成不扣分，先补做或复盘',
    makeupRule: item.makeupRule || `补卡完成 + ${makeupPoints} 积分`,
  }
}

function normalizeCompletionRecord(record) {
  if (!record) {
    return {
      completed: false,
      status: 'none',
      pointsDelta: 0,
      isMakeup: false,
    }
  }
  if (typeof record === 'boolean') {
    return {
      completed: record,
      status: record ? 'confirmed' : 'none',
      pointsDelta: 0,
      isMakeup: false,
    }
  }
  const status = record.status || (record.completed ? 'confirmed' : 'none')
  return {
    completed: Boolean(record.completed),
    status,
    pointsDelta: Number(record.pointsDelta || 0),
    isMakeup: Boolean(record.isMakeup),
  }
}

function timeToMinutes(time) {
  const match = String(time || '').match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return null
  const hour = Number(match[1])
  const minute = Number(match[2])
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null
  return hour * 60 + minute
}

function localDateValue(value) {
  const dateValue = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(dateValue.getTime())) return ''
  const year = dateValue.getFullYear()
  const month = String(dateValue.getMonth() + 1).padStart(2, '0')
  const day = String(dateValue.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function isBeforeStartTime(date, time, now) {
  const currentDate = localDateValue(now || new Date())
  if (date > currentDate) return true
  if (date < currentDate) return false
  const startMinutes = timeToMinutes(time)
  if (startMinutes === null) return false
  const current = now || new Date()
  return current.getHours() * 60 + current.getMinutes() < startMinutes
}

function decorateAgendaActions(items, date, today, options = {}) {
  const isParent = Boolean(options.isParent)
  const canUndoCompletion = Boolean(options.canUndoCompletion)
  const now = options.now || new Date()
  return items.map((item) => {
    if (item.category === 'milestone') {
      return Object.assign({}, item, {
        statusText: '倒计时',
        actionText: '倒计时',
        canToggleCompletion: false,
        isMakeup: false,
      })
    }
    if (item.completionStatus === 'pending') {
      return Object.assign({}, item, {
        statusText: isParent ? '确认完成' : '待确认',
        actionText: isParent ? '确认' : '待确认',
        canToggleCompletion: isParent,
        pendingCompletion: true,
        isMakeup: Boolean(item.completionIsMakeup),
      })
    }
    if (item.completed) {
      return Object.assign({}, item, {
        statusText: canUndoCompletion ? '撤销完成' : '已完成',
        actionText: canUndoCompletion ? '撤销' : '已完成',
        canToggleCompletion: canUndoCompletion,
        pendingCompletion: false,
        isMakeup: Boolean(item.completionIsMakeup),
      })
    }
    const isMakeup = date < today
    const allowMakeup = item.allowMakeup !== false
    const tooEarly = !isMakeup && isBeforeStartTime(date, item.time, now)
    return Object.assign({}, item, {
      statusText: tooEarly ? '未到时间' : isMakeup ? (allowMakeup ? '补打卡' : '不可补卡') : '待完成',
      actionText: tooEarly ? '未到' : isMakeup ? (allowMakeup ? '补卡' : '不可补') : '完成',
      canToggleCompletion: tooEarly ? false : (!isMakeup || allowMakeup),
      pendingCompletion: false,
      isMakeup,
    })
  })
}

module.exports = {
  getRewardSetting,
  normalizeCompletionRecord,
  decorateAgendaActions,
}
