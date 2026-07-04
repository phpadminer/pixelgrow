function buildNotifications(role, todayAgenda, redemptions, selectedChildId, selectedChild) {
  const notifications = []
  const childName = selectedChild ? selectedChild.name : '孩子'
  const pendingRedemptions = (redemptions || []).filter((item) => item.status === 'pending')
  const childPendingRedemptions = pendingRedemptions.filter((item) => !selectedChildId || item.childId === selectedChildId)
  const pendingCompletions = (todayAgenda || [])
    .filter((item) => item.category !== 'milestone' && item.pendingCompletion)
  const incomplete = (todayAgenda || [])
    .filter((item) => item.category !== 'milestone' && !item.completed && !item.pendingCompletion)

  if (role === 'parent' && childPendingRedemptions.length > 0) {
    notifications.push({
      id: `pending-redemption-${selectedChildId}-${childPendingRedemptions.length}`,
      tone: 'notice',
      title: `${childPendingRedemptions.length} 个兑换申请`,
      body: `${childName} 等待确认礼品兑换。`,
      actionTab: 'exchange',
    })
  }

  if (role === 'parent' && pendingCompletions.length > 0) {
    notifications.push({
      id: `pending-completion-${selectedChildId}-${pendingCompletions.length}`,
      tone: 'danger',
      title: `${pendingCompletions.length} 个完成/补卡申请`,
      body: `${childName} 提交了完成或补卡，等待家长确认。`,
      actionTab: 'today',
    })
  }

  if (role === 'child' && incomplete.length > 0) {
    notifications.push({
      id: `today-left-${selectedChildId}-${incomplete.length}-${incomplete[0].id}`,
      tone: 'warning',
      title: `今天还有 ${incomplete.length} 项`,
      body: `先完成「${incomplete[0].title}」。`,
      actionTab: 'today',
    })
  }

  return notifications
}

module.exports = {
  buildNotifications,
}
