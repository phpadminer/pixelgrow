const assert = require('assert')
const { decorateAgendaActions, getRewardSetting } = require('../utils/familyPlanMakeup')

function testDefaultMakeupAllowed() {
  const [item] = decorateAgendaActions([
    { id: 'task-1', category: 'task', completed: false, successPoints: 4 },
  ], '2026-07-03', '2026-07-04')

  assert.strictEqual(item.canToggleCompletion, true)
  assert.strictEqual(item.isMakeup, true)
  assert.strictEqual(item.statusText, '补打卡')
  assert.strictEqual(item.actionText, '补卡')
}

function testMakeupCanBeDisabled() {
  const [item] = decorateAgendaActions([
    { id: 'task-1', category: 'task', completed: false, allowMakeup: false },
  ], '2026-07-03', '2026-07-04')

  assert.strictEqual(item.canToggleCompletion, false)
  assert.strictEqual(item.isMakeup, true)
  assert.strictEqual(item.statusText, '不可补卡')
  assert.strictEqual(item.actionText, '不可补')
}

function testMakeupPointsAreSeparate() {
  const reward = getRewardSetting({
    successPoints: 4,
    failurePoints: 0,
    allowMakeup: true,
    makeupPoints: 2,
  })

  assert.strictEqual(reward.successPoints, 4)
  assert.strictEqual(reward.makeupPoints, 2)
}

function testCannotCompleteBeforeStartTime() {
  const [item] = decorateAgendaActions([
    { id: 'task-1', category: 'task', completed: false, time: '18:30' },
  ], '2026-07-04', '2026-07-04', { now: new Date('2026-07-04T18:20:00') })

  assert.strictEqual(item.canToggleCompletion, false)
  assert.strictEqual(item.statusText, '未到时间')
  assert.strictEqual(item.actionText, '未到')
}

function testPendingCompletionWaitsForParent() {
  const [item] = decorateAgendaActions([
    {
      id: 'task-1',
      category: 'task',
      completed: false,
      time: '18:30',
      completionStatus: 'pending',
    },
  ], '2026-07-04', '2026-07-04', { now: new Date('2026-07-04T18:40:00'), isParent: false })

  assert.strictEqual(item.pendingCompletion, true)
  assert.strictEqual(item.canToggleCompletion, false)
  assert.strictEqual(item.statusText, '待确认')
  assert.strictEqual(item.actionText, '待确认')
}

function testParentCanConfirmPendingCompletion() {
  const [item] = decorateAgendaActions([
    {
      id: 'task-1',
      category: 'task',
      completed: false,
      time: '18:30',
      completionStatus: 'pending',
    },
  ], '2026-07-04', '2026-07-04', { now: new Date('2026-07-04T18:40:00'), isParent: true })

  assert.strictEqual(item.pendingCompletion, true)
  assert.strictEqual(item.canToggleCompletion, true)
  assert.strictEqual(item.statusText, '确认完成')
  assert.strictEqual(item.actionText, '确认')
}

testDefaultMakeupAllowed()
testMakeupCanBeDisabled()
testMakeupPointsAreSeparate()
testCannotCompleteBeforeStartTime()
testPendingCompletionWaitsForParent()
testParentCanConfirmPendingCompletion()

console.log('familyPlanMakeup tests passed')
