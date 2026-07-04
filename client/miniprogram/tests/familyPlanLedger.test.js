const assert = require('assert')
const {
  buildLedgerDetail,
  decorateLedgerItem,
  summarizePointLedger,
} = require('../utils/familyPlanLedger')

const children = [
  { id: 'gege', name: '哥哥' },
  { id: 'meimei', name: '妹妹' },
]

const completion = decorateLedgerItem({
  id: 'ledger-1',
  childId: 'gege',
  sourceType: 'completion',
  sourceId: 'course-english-2026-07-04',
  pointsDelta: 4,
  balanceAfter: 8,
  note: '完成项目：英语补课',
  createdAt: '2026-07-04T10:30:00.000Z',
}, children)

assert.strictEqual(completion.childName, '哥哥')
assert.strictEqual(completion.typeText, '完成项目')
assert.strictEqual(completion.title, '英语补课')
assert.strictEqual(completion.deltaText, '+4')
assert.strictEqual(completion.isPositive, true)

const detail = buildLedgerDetail(completion)
assert.deepStrictEqual(detail.rows.map((row) => row.label), ['孩子', '类型', '内容', '时间', '余额'])
assert.strictEqual(detail.rows.find((row) => row.label === '余额').value, '8')

const redemption = decorateLedgerItem({
  id: 'ledger-2',
  childId: 'meimei',
  sourceType: 'redemption',
  sourceId: 'gift-movie',
  pointsDelta: -8,
  balanceAfter: 2,
  note: '申请兑换：周末家庭电影',
  createdAt: '2026-07-04T11:00:00.000Z',
}, children)

assert.strictEqual(redemption.typeText, '申请兑换')
assert.strictEqual(redemption.title, '周末家庭电影')
assert.strictEqual(redemption.deltaText, '-8')
assert.strictEqual(redemption.isPositive, false)

const summary = summarizePointLedger([completion, redemption])
assert.deepStrictEqual(summary, { earned: 4, spent: 8, net: -4 })

console.log('familyPlanLedger tests passed')
