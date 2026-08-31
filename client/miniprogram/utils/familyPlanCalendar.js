const TERM_ORDER = ['spring', 'summer', 'autumn']
const TERM_START_MONTH = { spring: 1, summer: 6, autumn: 8 }

function pad(value) {
  return value < 10 ? `0${value}` : `${value}`
}

function formatDate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function toDate(value) {
  return new Date(`${value}T00:00:00`)
}

function daysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate()
}

// 月视图按整周铺格子：1 号前面补上月的尾巴，末尾补下月的头。
// 当 1 号靠近周末时当月会横跨 6 个自然周（例如 2026 年 8 月 1 日是周六、共 31 天），
// 写死 35 格会把最后一两天挤掉，所以格子数必须按当月实际跨几周算。
// 下限保留 5 周，避免 2 月整好 4 周时卡片高度突然缩一截。
function getMonthGrid(selectedDate) {
  const date = toDate(selectedDate)
  const year = date.getFullYear()
  const monthIndex = date.getMonth()
  const leading = new Date(year, monthIndex, 1).getDay()
  const weeks = Math.max(5, Math.ceil((leading + daysInMonth(year, monthIndex)) / 7))
  return {
    startDate: formatDate(new Date(year, monthIndex, 1 - leading)),
    weeks,
    cellCount: weeks * 7,
  }
}

function addDays(dateValue, amount) {
  const date = toDate(dateValue)
  date.setDate(date.getDate() + amount)
  return formatDate(date)
}

function addMonths(dateValue, amount) {
  const date = toDate(dateValue)
  const target = new Date(date.getFullYear(), date.getMonth() + amount, 1)
  const day = Math.min(date.getDate(), daysInMonth(target.getFullYear(), target.getMonth()))
  return formatDate(new Date(target.getFullYear(), target.getMonth(), day))
}

function addYears(dateValue, amount) {
  const date = toDate(dateValue)
  const year = date.getFullYear() + amount
  const monthIndex = date.getMonth()
  const day = Math.min(date.getDate(), daysInMonth(year, monthIndex))
  return formatDate(new Date(year, monthIndex, day))
}

// 与 index.js 里 getTermMonths 的划分保持一致：春季 2-6 月、暑期 7-8 月、秋季 9 月到次年 1 月。
function getTermKey(dateValue) {
  const date = toDate(dateValue)
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  if (month >= 2 && month <= 6) return { kind: 'spring', year }
  if (month >= 7 && month <= 8) return { kind: 'summer', year }
  if (month === 1) return { kind: 'autumn', year: year - 1 }
  return { kind: 'autumn', year }
}

function stepTerm(dateValue, amount) {
  const current = getTermKey(dateValue)
  let index = TERM_ORDER.indexOf(current.kind) + amount
  let year = current.year
  while (index < 0) {
    index += TERM_ORDER.length
    year -= 1
  }
  while (index >= TERM_ORDER.length) {
    index -= TERM_ORDER.length
    year += 1
  }
  const kind = TERM_ORDER[index]
  return formatDate(new Date(year, TERM_START_MONTH[kind], 1))
}

// 日历头部的 ‹ › 要按当前视图的粒度翻页：月视图翻月、周视图翻周、学期视图翻学期、年视图翻年。
// 统一按天挪的话，月/学期/年视图下点一次几乎看不出变化。
function stepSelectedDate(selectedDate, amount, viewMode) {
  const step = Number(amount) || 0
  if (!step) return selectedDate
  if (viewMode === 'week') return addDays(selectedDate, step * 7)
  if (viewMode === 'month') return addMonths(selectedDate, step)
  if (viewMode === 'term') return stepTerm(selectedDate, step)
  if (viewMode === 'year') return addYears(selectedDate, step)
  return addDays(selectedDate, step)
}

module.exports = {
  addMonths,
  addYears,
  getMonthGrid,
  getTermKey,
  stepSelectedDate,
  stepTerm,
}
