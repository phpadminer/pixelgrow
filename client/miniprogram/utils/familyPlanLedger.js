function pad(value) {
  return String(value).padStart(2, '0')
}

function formatDateTime(value) {
  if (!value) return '未知时间'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return `${date.getMonth() + 1}月${date.getDate()}日 ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function splitNote(note) {
  const text = String(note || '').trim()
  const match = text.match(/^([^:：]+)[:：]\s*(.+)$/)
  if (!match) return { typeText: '', title: text || '积分记录' }
  return {
    typeText: match[1].trim(),
    title: match[2].trim() || text,
  }
}

function typeTextFromSource(sourceType, note) {
  const noteParts = splitNote(note)
  if (noteParts.typeText) return noteParts.typeText
  const sourceMap = {
    completion: '完成项目',
    redemption: '申请兑换',
    redemption_refund: '兑换退回',
  }
  return sourceMap[sourceType] || '积分调整'
}

function titleFromNote(sourceId, note) {
  const noteParts = splitNote(note)
  if (noteParts.title && noteParts.title !== '积分记录') return noteParts.title
  return sourceId || '积分记录'
}

function decorateLedgerItem(record, children = []) {
  const child = children.find((item) => item.id === record.childId)
  const pointsDelta = Number(record.pointsDelta || 0)
  const typeText = typeTextFromSource(record.sourceType, record.note)
  return Object.assign({}, record, {
    childName: child ? child.name : '孩子',
    typeText,
    title: titleFromNote(record.sourceId, record.note),
    pointsDelta,
    deltaText: `${pointsDelta > 0 ? '+' : ''}${pointsDelta}`,
    isPositive: pointsDelta >= 0,
    balanceText: String(Number(record.balanceAfter || 0)),
    timeText: formatDateTime(record.createdAt),
  })
}

function buildLedgerDetail(item) {
  if (!item) return null
  return {
    title: item.title || '积分记录',
    typeText: item.typeText || '积分记录',
    deltaText: item.deltaText || `${Number(item.pointsDelta || 0) > 0 ? '+' : ''}${Number(item.pointsDelta || 0)}`,
    isPositive: item.isPositive !== false,
    rows: [
      { label: '孩子', value: item.childName || '孩子' },
      { label: '类型', value: item.typeText || '积分记录' },
      { label: '内容', value: item.title || item.note || item.sourceId || '积分记录' },
      { label: '时间', value: item.timeText || formatDateTime(item.createdAt) },
      { label: '余额', value: item.balanceText || String(Number(item.balanceAfter || 0)) },
    ],
  }
}

function summarizePointLedger(records) {
  return (records || []).reduce((result, record) => {
    const delta = Number(record.pointsDelta || 0)
    const isRedemption = record.sourceType === 'redemption'
    return {
      earned: result.earned + (delta > 0 ? delta : 0),
      spent: result.spent + (isRedemption && delta < 0 ? Math.abs(delta) : 0),
      net: result.net + delta,
    }
  }, { earned: 0, spent: 0, net: 0 })
}

module.exports = {
  buildLedgerDetail,
  decorateLedgerItem,
  summarizePointLedger,
}
