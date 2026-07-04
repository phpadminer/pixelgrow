const assert = require('assert')
const {
  pickSummaryAgenda,
  shouldShowSummaryCard,
} = require('../utils/familyPlanSummary')

assert.strictEqual(shouldShowSummaryCard('today'), true)
assert.strictEqual(shouldShowSummaryCard('calendar'), true)
assert.strictEqual(shouldShowSummaryCard('stats'), false)
assert.strictEqual(shouldShowSummaryCard('exchange'), false)
assert.strictEqual(shouldShowSummaryCard('profile'), false)
assert.strictEqual(shouldShowSummaryCard('notifications'), false)

const todayAgenda = [{ id: 'today' }]
const selectedAgenda = [{ id: 'selected' }]

assert.deepStrictEqual(pickSummaryAgenda('today', todayAgenda, selectedAgenda), todayAgenda)
assert.deepStrictEqual(pickSummaryAgenda('calendar', todayAgenda, selectedAgenda), selectedAgenda)
assert.deepStrictEqual(pickSummaryAgenda('stats', todayAgenda, selectedAgenda), selectedAgenda)

console.log('familyPlanSummary tests passed')
