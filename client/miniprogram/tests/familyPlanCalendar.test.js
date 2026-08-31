const assert = require('assert')
const {
  addMonths,
  addYears,
  getMonthGrid,
  getTermKey,
  stepSelectedDate,
  stepTerm,
} = require('../utils/familyPlanCalendar')

function pad(value) {
  return value < 10 ? `0${value}` : `${value}`
}

function gridDates(selectedDate) {
  const grid = getMonthGrid(selectedDate)
  const start = new Date(`${grid.startDate}T00:00:00`)
  return Array.from({ length: grid.cellCount }, (_, index) => {
    const current = new Date(start)
    current.setDate(start.getDate() + index)
    return `${current.getFullYear()}-${pad(current.getMonth() + 1)}-${pad(current.getDate())}`
  })
}

// 2026 年 8 月：1 号是周六、共 31 天，横跨 6 个自然周，35 格会丢掉 8/30 和 8/31。
assert.deepStrictEqual(getMonthGrid('2026-08-31'), {
  startDate: '2026-07-26',
  weeks: 6,
  cellCount: 42,
})
assert(gridDates('2026-08-31').includes('2026-08-30'))
assert(gridDates('2026-08-31').includes('2026-08-31'))

// 5 周的普通月份保持原样，卡片高度不变。
assert.deepStrictEqual(getMonthGrid('2026-09-15'), {
  startDate: '2026-08-30',
  weeks: 5,
  cellCount: 35,
})

// 2026 年 2 月正好 4 整周，仍按 5 周渲染，避免高度跳变。
assert.deepStrictEqual(getMonthGrid('2026-02-10'), {
  startDate: '2026-02-01',
  weeks: 5,
  cellCount: 35,
})

// 任意月份的每一天都必须出现在格子里。
for (let year = 2024; year <= 2032; year += 1) {
  for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
    const total = new Date(year, monthIndex + 1, 0).getDate()
    const dates = gridDates(`${year}-${pad(monthIndex + 1)}-01`)
    for (let day = 1; day <= total; day += 1) {
      const value = `${year}-${pad(monthIndex + 1)}-${pad(day)}`
      assert(dates.includes(value), `月视图缺少 ${value}`)
    }
  }
}

// ‹ › 按视图粒度翻页
assert.strictEqual(stepSelectedDate('2026-08-31', 1, 'day'), '2026-09-01')
assert.strictEqual(stepSelectedDate('2026-08-31', -1, 'day'), '2026-08-30')
assert.strictEqual(stepSelectedDate('2026-08-31', 1, 'week'), '2026-09-07')
assert.strictEqual(stepSelectedDate('2026-08-31', -1, 'week'), '2026-08-24')
assert.strictEqual(stepSelectedDate('2026-08-31', 1, 'month'), '2026-09-30')
assert.strictEqual(stepSelectedDate('2026-08-31', -1, 'month'), '2026-07-31')
assert.strictEqual(stepSelectedDate('2026-12-15', 1, 'month'), '2027-01-15')
assert.strictEqual(stepSelectedDate('2026-08-31', 1, 'year'), '2027-08-31')
assert.strictEqual(stepSelectedDate('2028-02-29', 1, 'year'), '2029-02-28')
assert.strictEqual(stepSelectedDate('2026-08-31', 0, 'month'), '2026-08-31')

// 学期：春季 2-6 月、暑期 7-8 月、秋季 9 月到次年 1 月
assert.deepStrictEqual(getTermKey('2027-01-10'), { kind: 'autumn', year: 2026 })
assert.deepStrictEqual(getTermKey('2026-08-31'), { kind: 'summer', year: 2026 })
assert.strictEqual(stepTerm('2026-08-31', 1), '2026-09-01')
assert.strictEqual(stepTerm('2026-08-31', -1), '2026-02-01')
assert.strictEqual(stepTerm('2026-11-20', 1), '2027-02-01')
assert.strictEqual(stepTerm('2027-01-10', -1), '2026-07-01')
assert.strictEqual(stepSelectedDate('2026-08-31', 1, 'term'), '2026-09-01')

// 月/年边界的补角
assert.strictEqual(addMonths('2026-01-31', 1), '2026-02-28')
assert.strictEqual(addMonths('2026-03-31', -1), '2026-02-28')
assert.strictEqual(addYears('2026-08-31', -1), '2025-08-31')

console.log('familyPlanCalendar tests passed')
