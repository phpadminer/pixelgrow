const GUEST_MODE_TTL_MS = 3 * 24 * 60 * 60 * 1000
const GUEST_PLAN_DATA_KEYS = ['children', 'courses', 'habits', 'tasks', 'milestones', 'gifts', 'redemptions', 'pointLedger', 'rules']

function isGuestSession(session) {
  return !session || !session.token
}

function createGuestSession(now = Date.now()) {
  return {
    id: `guest-${now}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: now,
    expiresAt: now + GUEST_MODE_TTL_MS,
  }
}

function isGuestExpired(session, now = Date.now()) {
  return !session || Number(session.expiresAt || 0) <= now
}

function getGuestExpiryText(session, now = Date.now()) {
  if (!session || !session.expiresAt) return '游客体验 3 天有效'
  const remainingMs = Math.max(0, Number(session.expiresAt) - now)
  const days = Math.ceil(remainingMs / (24 * 60 * 60 * 1000))
  return days > 0 ? `游客体验还剩 ${days} 天` : '游客体验已过期'
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
  return upsertGuestPlanItem(tasks || [], {
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

function upsertGuestPlanItem(items, item) {
  const list = (items || []).slice()
  const index = list.findIndex((entry) => entry.id === item.id)
  if (index >= 0) {
    list[index] = Object.assign({}, list[index], item)
    return list
  }
  list.push(item)
  return list
}

function deleteGuestPlanItem(items, id) {
  return (items || []).filter((item) => item.id !== id)
}

function countGuestPlanData(plan) {
  if (!plan) return 0
  const listCount = GUEST_PLAN_DATA_KEYS.reduce((total, key) => {
    const value = plan[key]
    return total + (Array.isArray(value) ? value.length : 0)
  }, 0)
  return listCount + Object.keys(plan.completions || {}).length
}

function hasGuestPlanData(plan) {
  return countGuestPlanData(plan) > 0
}

module.exports = {
  GUEST_MODE_TTL_MS,
  addGuestTask,
  applyGuestCompletion,
  countGuestPlanData,
  createGuestSession,
  deleteGuestPlanItem,
  getGuestExpiryText,
  hasGuestPlanData,
  isGuestExpired,
  isGuestSession,
  upsertGuestPlanItem,
}
