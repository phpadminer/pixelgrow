const assert = require('assert')
const fs = require('fs')
const path = require('path')
const {
  addGuestTask,
  applyGuestCompletion,
  applyGuestCompletionReward,
  countGuestPlanData,
  createGuestSession,
  deleteGuestPlanItem,
  hasGuestPlanData,
  isGuestExpired,
  isGuestSession,
  upsertGuestPlanItem,
} = require('../utils/familyPlanGuestMode')

const pageJs = fs.readFileSync(path.join(__dirname, '../pages/family-plan/index.js'), 'utf8')

assert.strictEqual(isGuestSession(null), true)
assert.strictEqual(isGuestSession({}), true)
assert.strictEqual(isGuestSession({ token: 'token-1' }), false)

const guestSession = createGuestSession(1000)
assert(guestSession.id.startsWith('guest-'))
assert.strictEqual(guestSession.expiresAt, 1000 + 3 * 24 * 60 * 60 * 1000)
assert.strictEqual(isGuestExpired(guestSession, guestSession.expiresAt - 1), false)
assert.strictEqual(isGuestExpired(guestSession, guestSession.expiresAt), true)

assert(
  /getOrCreateGuestSession\(\)[\s\S]*?if \(isGuestExpired\(guestSession, now\)\) \{[\s\S]*?guestSession = createGuestSession\(now\)/.test(pageJs)
    && !/GUEST_VERSION|guestStorageVersion|storageVersion|versionedGuest/i.test(pageJs),
  'guest data should reset by expiry or manual clear, not app version changes'
)

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

const rewardPlan = {
  children: [{ id: 'gege', points: 0 }],
  completions: {},
  pointLedger: [],
}
const rewarded = applyGuestCompletionReward(rewardPlan, {
  itemKey: 'task-guest-task-1-2026-07-06',
  childId: 'gege',
  title: '体验任务',
  completed: true,
  isMakeup: false,
  successPoints: 4,
  makeupPoints: 2,
  failurePoints: 0,
})
assert.strictEqual(rewarded.children[0].points, 4)
assert.strictEqual(rewarded.completions['task-guest-task-1-2026-07-06'].pointsDelta, 4)
assert.strictEqual(rewarded.pointLedger.length, 1)
assert.strictEqual(rewarded.pointLedger[0].pointsDelta, 4)
assert.strictEqual(rewarded.pointLedger[0].balanceAfter, 4)

const reverted = applyGuestCompletionReward(rewarded, {
  itemKey: 'task-guest-task-1-2026-07-06',
  childId: 'gege',
  title: '体验任务',
  completed: false,
  isMakeup: false,
  successPoints: 4,
  makeupPoints: 2,
  failurePoints: 0,
})
assert.strictEqual(reverted.children[0].points, 0)
assert.strictEqual(reverted.completions['task-guest-task-1-2026-07-06'].pointsDelta, 0)
assert.strictEqual(reverted.pointLedger.length, 2)
assert.strictEqual(reverted.pointLedger[1].pointsDelta, -4)
assert.strictEqual(reverted.pointLedger[1].balanceAfter, 0)

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
assert.strictEqual(countGuestPlanData(guestPlan), 8)
assert.strictEqual(hasGuestPlanData(guestPlan), true)
assert.strictEqual(hasGuestPlanData({ children: [{ id: 'guest-child-1' }] }), true)

assert(
  /if \(this\.data\.isGuest\) \{[\s\S]*?applyGuestCompletionReward\(this\.currentGuestPlan\(\), \{[\s\S]*?successPoints: item\.successPoints[\s\S]*?this\.refreshGuestPlan\(nextPlan\)/.test(pageJs),
  'guest completion should update child points and ledger, not only completion status'
)

console.log('familyPlanGuestMode tests passed')
