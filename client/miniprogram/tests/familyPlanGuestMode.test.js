const assert = require('assert')
const {
  addGuestTask,
  applyGuestCompletion,
  countGuestPlanData,
  createGuestSession,
  deleteGuestPlanItem,
  hasGuestPlanData,
  isGuestExpired,
  isGuestSession,
  upsertGuestPlanItem,
} = require('../utils/familyPlanGuestMode')

assert.strictEqual(isGuestSession(null), true)
assert.strictEqual(isGuestSession({}), true)
assert.strictEqual(isGuestSession({ token: 'token-1' }), false)

const guestSession = createGuestSession(1000)
assert(guestSession.id.startsWith('guest-'))
assert.strictEqual(guestSession.expiresAt, 1000 + 3 * 24 * 60 * 60 * 1000)
assert.strictEqual(isGuestExpired(guestSession, guestSession.expiresAt - 1), false)
assert.strictEqual(isGuestExpired(guestSession, guestSession.expiresAt), true)

const original = {
  'task-homework-2026-07-06': {
    completed: false,
    status: 'confirmed',
    pointsDelta: 0,
    isMakeup: false,
  },
}

const completed = applyGuestCompletion(original, 'task-homework-2026-07-06', true, { isMakeup: true })
assert.notStrictEqual(completed, original)
assert.strictEqual(original['task-homework-2026-07-06'].completed, false)
assert.deepStrictEqual(completed['task-homework-2026-07-06'], {
  completed: true,
  status: 'confirmed',
  pointsDelta: 0,
  isMakeup: true,
})

const cancelled = applyGuestCompletion(completed, 'task-homework-2026-07-06', false)
assert.deepStrictEqual(cancelled['task-homework-2026-07-06'], {
  completed: false,
  status: 'confirmed',
  pointsDelta: 0,
  isMakeup: false,
})

const tasks = [{ id: 'existing-task' }]
const nextTasks = addGuestTask(tasks, {
  id: 'guest-task-1',
  childId: 'gege',
  title: '体验任务',
  dueDate: '2026-07-06',
  time: '19:30',
  focusMinutes: 20,
  breakMinutes: 5,
  successPoints: 3,
  failurePoints: 0,
  allowMakeup: true,
  makeupPoints: 1,
  successRule: '体验完成',
  makeupRule: '体验补卡',
  failureRule: '体验复盘',
})
assert.strictEqual(tasks.length, 1)
assert.strictEqual(nextTasks.length, 2)
assert.deepStrictEqual(nextTasks[1], {
  id: 'guest-task-1',
  childId: 'gege',
  title: '体验任务',
  dueDate: '2026-07-06',
  time: '19:30',
  meta: '临时任务',
  focusMode: 'pomodoro',
  focusMinutes: 20,
  breakMinutes: 5,
  successPoints: 3,
  failurePoints: 0,
  allowMakeup: true,
  makeupPoints: 1,
  successRule: '体验完成',
  makeupRule: '体验补卡',
  failureRule: '体验复盘',
})

const guestCourse = {
  id: 'guest-course-1',
  childId: 'gege',
  subject: '体验课程',
  teacher: '王老师',
  startDate: '2026-07-06',
  settlementDate: '2026-07-31',
  weekday: 1,
  weekdays: [1],
  schedules: [{ weekday: 1, time: '18:30', lessonType: 'formal' }],
  extraSessions: [],
  time: '18:30',
  durationMinutes: 60,
}
const courses = upsertGuestPlanItem([], guestCourse)
assert.deepStrictEqual(courses, [guestCourse])
assert.deepStrictEqual(upsertGuestPlanItem(courses, Object.assign({}, guestCourse, { teacher: '李老师' }))[0].teacher, '李老师')
assert.deepStrictEqual(deleteGuestPlanItem(courses, 'guest-course-1'), [])

const guestPlan = {
  children: [{ id: 'gege' }],
  courses: [guestCourse],
  habits: [{ id: 'guest-habit-1' }],
  tasks: [nextTasks[1]],
  milestones: [],
  gifts: [{ id: 'guest-gift-1' }],
  redemptions: [{ id: 'guest-redemption-1' }],
  pointLedger: [],
  rules: [{ id: 'guest-rule-1' }],
  completions: {
    'task-guest-task-1-2026-07-06': {
      completed: true,
      status: 'confirmed',
    },
  },
}
assert.strictEqual(countGuestPlanData(guestPlan), 7)
assert.strictEqual(hasGuestPlanData(guestPlan), true)
assert.strictEqual(hasGuestPlanData({ children: [{ id: 'gege' }] }), false)

console.log('familyPlanGuestMode tests passed')
