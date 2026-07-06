const assert = require('assert')
const {
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

console.log('familyPlanGuestMode tests passed')
