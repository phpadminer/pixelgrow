const assert = require('assert')
const {
  addGuestTask,
  applyGuestCompletion,
  isGuestSession,
} = require('../utils/familyPlanGuestMode')

assert.strictEqual(isGuestSession(null), true)
assert.strictEqual(isGuestSession({}), true)
assert.strictEqual(isGuestSession({ token: 'token-1' }), false)

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

console.log('familyPlanGuestMode tests passed')
