function shouldShowSummaryCard(activeTab) {
  return activeTab === 'today' || activeTab === 'calendar'
}

function pickSummaryAgenda(activeTab, todayAgenda, selectedAgenda) {
  return activeTab === 'calendar' || activeTab === 'stats' ? selectedAgenda : todayAgenda
}

function summaryLabel(activeTab, selectedDateLabel) {
  return activeTab === 'calendar' || activeTab === 'stats' ? `${selectedDateLabel}完成率` : '今日完成率'
}

module.exports = {
  pickSummaryAgenda,
  shouldShowSummaryCard,
  summaryLabel,
}
