const assert = require('assert')
const { buildNotifications } = require('../utils/familyPlanNotifications')

function testParentOnlySeesPendingCompletionForAudit() {
  const notifications = buildNotifications(
    'parent',
    [
      { id: 'task-a', category: 'task', title: '口算', completed: false, pendingCompletion: false },
      { id: 'task-b', category: 'task', title: '阅读', completed: false, pendingCompletion: true, isMakeup: false },
      { id: 'task-c', category: 'task', title: '补写', completed: false, pendingCompletion: true, isMakeup: true },
    ],
    [],
    'child-a',
    { name: '哥哥' }
  )

  assert.strictEqual(notifications.length, 1)
  assert.strictEqual(notifications[0].title, '2 个完成/补卡申请')
  assert.strictEqual(notifications[0].body, '哥哥 提交了完成或补卡，等待家长确认。')
  assert.strictEqual(notifications[0].actionTab, 'today')
}

function testChildStillSeesIncompleteReminder() {
  const notifications = buildNotifications(
    'child',
    [
      { id: 'task-a', category: 'task', title: '口算', completed: false, pendingCompletion: false },
      { id: 'task-b', category: 'task', title: '阅读', completed: false, pendingCompletion: true },
    ],
    [],
    'child-a',
    { name: '哥哥' }
  )

  assert.strictEqual(notifications.length, 1)
  assert.strictEqual(notifications[0].title, '今天还有 1 项')
  assert.strictEqual(notifications[0].body, '先完成「口算」。')
}

testParentOnlySeesPendingCompletionForAudit()
testChildStillSeesIncompleteReminder()

console.log('familyPlanNotifications tests passed')
