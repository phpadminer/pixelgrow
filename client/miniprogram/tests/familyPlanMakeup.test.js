const assert = require('assert')
const fs = require('fs')
const path = require('path')
const { decorateAgendaActions, getRewardSetting } = require('../utils/familyPlanMakeup')

const pageJs = fs.readFileSync(path.join(__dirname, '../pages/family-plan/index.js'), 'utf8')

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

function testParentCanUndoConfirmedCompletion() {
  const [item] = decorateAgendaActions([
    {
      id: 'task-1',
      category: 'task',
      completed: true,
      completionStatus: 'confirmed',
      completionPointsDelta: 4,
    },
  ], '2026-07-04', '2026-07-04', { canUndoCompletion: true })

  assert.strictEqual(item.canToggleCompletion, true)
  assert.strictEqual(item.statusText, '撤销完成')
  assert.strictEqual(item.actionText, '撤销')
  assert.strictEqual(item.completionPointsDelta, 4)
}

function testChildCannotUndoConfirmedCompletion() {
  const [item] = decorateAgendaActions([
    {
      id: 'task-1',
      category: 'task',
      completed: true,
      completionStatus: 'confirmed',
    },
  ], '2026-07-04', '2026-07-04', { canUndoCompletion: false })

  assert.strictEqual(item.canToggleCompletion, false)
  assert.strictEqual(item.statusText, '已完成')
  assert.strictEqual(item.actionText, '已完成')
}

testDefaultMakeupAllowed()
testMakeupCanBeDisabled()
testMakeupPointsAreSeparate()
testCannotCompleteBeforeStartTime()
testPendingCompletionWaitsForParent()
testParentCanConfirmPendingCompletion()
testParentCanUndoConfirmedCompletion()
testChildCannotUndoConfirmedCompletion()

assert(
  /const canActAsParent = role === 'parent' \|\| isGuestParentPreview/.test(pageJs)
    && /const actionOptions = \{ now, isParent: canActAsParent, canUndoCompletion: canActAsParent \}/.test(pageJs),
  'parent and guest parent preview should enable undo for confirmed completions'
)

assert(
  /item\.completed \? '撤销完成'[\s\S]*?撤销「\$\{item\.title\}」完成记录/.test(pageJs),
  'completion toggle dialog should use undo wording for completed items'
)

console.log('familyPlanMakeup tests passed')
