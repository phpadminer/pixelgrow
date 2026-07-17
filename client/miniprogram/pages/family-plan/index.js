const api = require('../../utils/familyPlanApi')
const {
  getRewardSetting,
  normalizeCompletionRecord,
  decorateAgendaActions,
} = require('../../utils/familyPlanMakeup')
const {
  buildLedgerDetail,
  decorateLedgerItem,
  summarizePointLedger,
} = require('../../utils/familyPlanLedger')
const {
  pickSummaryAgenda,
  shouldShowSummaryCard,
  summaryLabel,
} = require('../../utils/familyPlanSummary')
const { buildNotifications } = require('../../utils/familyPlanNotifications')
const {
  addGuestTask,
  applyGuestCompletionReward,
  createGuestSession,
  deleteGuestPlanItem,
  getGuestExpiryText,
  hasGuestPlanData,
  isGuestExpired,
  upsertGuestPlanItem,
} = require('../../utils/familyPlanGuestMode')
const {
  JPEG_DATA_URL_PREFIX,
  MAX_GIFT_IMAGE_BYTES,
  buildGiftPayload,
  isGiftImageDataUrlWithinLimit,
  makeGiftImageCompressionPlan,
  validateGiftDraft,
} = require('../../utils/familyPlanGiftImage')
const {
  formatCourseScheduleLabel,
  getCourseSchedules,
  getCourseSessionForDate,
  lessonTypeLabel,
  normalizeLessonType,
  normalizeCourseExtraSessions,
  postponeCourseLessonsFromDate,
  summarizeCourseLessons,
  upsertCourseExtraSession,
} = require('../../utils/familyPlanCourseSchedule')

const SESSION_KEY = 'familyPlanSession'
const GUEST_SESSION_KEY = 'familyPlanGuestSession'
const GUEST_PLAN_KEY = 'familyPlanGuestPlan'
const GUEST_NOTICE_DISMISSED_KEY = 'familyPlanGuestNoticeDismissed'
const WEEKDAY_VALUES = [0, 1, 2, 3, 4, 5, 6]
const WEEKDAY_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
const GRADES = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级', '初一', '初二', '初三']
const CALENDAR_VIEW_OPTIONS = [
  { key: 'day', label: '日' },
  { key: 'week', label: '周' },
  { key: 'month', label: '月' },
  { key: 'term', label: '学期' },
  { key: 'year', label: '年' },
]

function emptyGuestPlan() {
  return {
    children: [],
    courses: [],
    habits: [],
    tasks: [],
    milestones: [],
    completions: {},
    gifts: [],
    redemptions: [],
    pointLedger: [],
    rules: [],
  }
}

function defaultGuestChild() {
  const suffix = Date.now().toString(36)
  return {
    id: `guest-child-${suffix}`,
    name: '我的孩子',
    avatar: 'lamb',
    grade: '一年级',
    points: 0,
  }
}

function isDefaultGuestChild(child) {
  return Boolean(child)
    && typeof child.id === 'string'
    && child.id.startsWith('guest-child-')
    && child.name === '我的孩子'
    && (child.avatar || 'lamb') === 'lamb'
    && (child.grade || '一年级') === '一年级'
}

function makeWeekdayOptions(selectedValues = []) {
  return WEEKDAY_VALUES.map((value, index) => ({
    value,
    label: WEEKDAY_LABELS[index],
    selected: selectedValues.indexOf(value) >= 0,
  }))
}

function makeWeekdaySchedules(selectedValues = [], scheduleTimes = {}, scheduleLessonTypes = {}, fallbackTime = '18:30') {
  return WEEKDAY_VALUES
    .map((value, index) => ({
      value,
      label: WEEKDAY_LABELS[index],
      selected: selectedValues.indexOf(value) >= 0,
      time: scheduleTimes[value] || fallbackTime,
      lessonType: normalizeLessonType(scheduleLessonTypes[value]),
      lessonTypeLabel: lessonTypeLabel(scheduleLessonTypes[value]),
    }))
    .filter((item) => item.selected)
}

const PARENT_TABS = [
  { key: 'today', label: '今天', iconClass: 'today' },
  { key: 'calendar', label: '日历', iconClass: 'calendar' },
  { key: 'stats', label: '统计', iconClass: 'stats' },
  { key: 'exchange', label: '兑换', iconClass: 'exchange' },
  { key: 'rules', label: '规则', iconClass: 'rules' },
]

const CHILD_TABS = [
  { key: 'today', label: '今天', iconClass: 'today' },
  { key: 'calendar', label: '日历', iconClass: 'calendar' },
  { key: 'stats', label: '统计', iconClass: 'stats' },
  { key: 'exchange', label: '兑换', iconClass: 'exchange' },
  { key: 'profile', label: '我的', iconClass: 'profile' },
]

const FAMILY_RELATION_OPTIONS = [
  { label: '暂不设置', value: '' },
  { label: '爸爸', value: 'father' },
  { label: '妈妈', value: 'mother' },
  { label: '爷爷', value: 'paternalGrandpa' },
  { label: '奶奶', value: 'paternalGrandma' },
  { label: '外公', value: 'maternalGrandpa' },
  { label: '外婆', value: 'maternalGrandma' },
  { label: '其他家人', value: 'guardian' },
]

const INVITE_ROLE_OPTIONS = [
  { label: '家长', value: 'parent' },
  { label: '管理员', value: 'admin' },
  { label: '只读', value: 'viewer' },
]

const MEMBER_ROLE_OPTIONS = [
  { label: '管理员', value: 'admin' },
  { label: '家长', value: 'parent' },
  { label: '只读', value: 'viewer' },
]

const TAB_TITLES = {
  today: '家庭计划',
  calendar: '日历总览',
  stats: '统计',
  exchange: '兑换中心',
  rules: '规则',
  profile: '个人中心',
  notifications: '通知中心',
}

const CATEGORY_META = {
  course: { label: '课程', className: 'course', color: '#f5a316' },
  habit: { label: '习惯', className: 'habit', color: '#0b9d84' },
  task: { label: '任务', className: 'task', color: '#ef6b5a' },
  milestone: { label: '节点', className: 'milestone', color: '#2f7fe8' },
}

function pad(value) {
  return String(value).padStart(2, '0')
}

function formatDate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function todayString() {
  return formatDate(new Date())
}

function toDate(value) {
  return new Date(`${value}T00:00:00`)
}

function weekdayIndexFromDate(dateValue) {
  const weekday = toDate(dateValue).getDay()
  const index = WEEKDAY_VALUES.indexOf(weekday)
  return index >= 0 ? index : 0
}

function addDays(dateValue, amount) {
  const date = toDate(dateValue)
  date.setDate(date.getDate() + amount)
  return formatDate(date)
}

function daysBetween(fromDate, toDateValue) {
  return Math.round((toDate(toDateValue).getTime() - toDate(fromDate).getTime()) / 86400000)
}

function shortDate(dateValue) {
  const [, month, day] = dateValue.split('-')
  return `${Number(month)}月${Number(day)}日`
}

function isInsideRange(date, startDate, endDate) {
  return date >= startDate && date <= endDate
}

function getAvatarPath(avatar) {
  if (avatar === 'chick') return '/assets/family/chick.svg'
  if (avatar === 'dragon') return '/assets/family/dragon.svg'
  if (avatar === 'monkey') return '/assets/family/monkey.svg'
  return '/assets/family/lamb.svg'
}

function getPatternPath(avatar) {
  return avatar === 'lamb' ? '/assets/family/sheep-hoof.svg' : '/assets/family/chicken-foot.svg'
}

function getTabsForRole(role) {
  return role === 'child' ? CHILD_TABS : PARENT_TABS
}

function getPageTitle(role, tab) {
  if (tab === 'today') {
    return role === 'child' ? '今天要完成' : '家庭计划'
  }
  return TAB_TITLES[tab] || '家庭计划'
}

function getRoleLabel(role) {
  if (role === 'parent') return '家长端'
  if (role === 'child') return '孩子端'
  return '体验模式'
}

function getFamilyMemberRoleLabel(role) {
  if (role === 'owner') return '创建者'
  if (role === 'admin') return '管理员'
  if (role === 'viewer') return '只读成员'
  return '家长成员'
}

function findOptionIndex(options, value) {
  const index = options.findIndex((item) => item.value === value)
  return index >= 0 ? index : 0
}

function getFamilyRelationLabel(relation) {
  return FAMILY_RELATION_OPTIONS[findOptionIndex(FAMILY_RELATION_OPTIONS, relation)].label
}

function getAccountInitial(name) {
  const value = String(name || '微').trim()
  return value ? value.slice(0, 1) : '微'
}

function getRenderableAccountAvatarUrl(avatarUrl) {
  const value = String(avatarUrl || '').trim()
  if (!value) return ''
  if (/^data:image\//.test(value)) return ''
  return /^https?:\/\//.test(value) ? value : ''
}

function sanitizeSessionForRender(session) {
  if (!session || !session.account) return session
  const account = Object.assign({}, session.account, {
    avatarUrl: getRenderableAccountAvatarUrl(session.account.avatarUrl),
  })
  return Object.assign({}, session, { account })
}

function needsWechatProfile(session) {
  const account = session && session.account ? session.account : null
  if (!account) return false
  const nickname = String(account.nickname || '').trim()
  return !nickname || nickname === '微信用户' || !account.avatarUrl
}

function decodeInviteCode(value) {
  if (!value) return ''
  try {
    return decodeURIComponent(value)
  } catch (err) {
    return String(value)
  }
}

function decorateFamilyMember(member, canManageMembers) {
  const nickname = member.nickname || '微信用户'
  const relationLabel = getFamilyRelationLabel(member.relation)
  return Object.assign({}, member, {
    avatarUrl: getRenderableAccountAvatarUrl(member.avatarUrl),
    nickname,
    roleLabel: getFamilyMemberRoleLabel(member.role),
    roleIndex: findOptionIndex(MEMBER_ROLE_OPTIONS, member.role),
    relationIndex: findOptionIndex(FAMILY_RELATION_OPTIONS, member.relation),
    canManageRelation: Boolean(canManageMembers && !member.isCurrentAccount && member.role !== 'owner'),
    canManageRole: Boolean(canManageMembers && !member.isCurrentAccount && member.role !== 'owner'),
    relationLabel,
    relationText: member.relation ? relationLabel : '未设置身份',
    avatarText: getAccountInitial(nickname),
    currentText: member.isCurrentAccount ? '当前账号' : '',
  })
}

function decorateFamilyManagedChild(child) {
  const isBound = child.bindStatus === 'bound'
  return Object.assign({}, child, {
    avatarPath: getAvatarPath(child.avatar),
    bindStatusText: isBound ? '已绑定微信' : '未绑定微信',
    canBindWechat: !isBound,
  })
}

function decorateInviteInfo(inviteInfo) {
  if (!inviteInfo) return null
  const isChildInvite = inviteInfo.role === 'child'
  const relationLabel = getFamilyRelationLabel(inviteInfo.relation)
  return Object.assign({}, inviteInfo, {
    label: isChildInvite ? '孩子绑定码' : '家人邀请码',
    hint: isChildInvite
      ? `发给孩子微信，登录后绑定到 ${inviteInfo.childName || '这个孩子'}`
      : `已复制到剪贴板，也可以直接微信分享给${inviteInfo.relation ? relationLabel : '家人'}。`,
  })
}

function shouldOpenFamilySwitcherOnEntry(session) {
  return Boolean(
    session
      && session.role === 'parent'
      && session.account
      && !getActiveFamily(session)
  )
}

function getActiveFamily(session) {
  if (!session) return null
  if (session.activeFamily) return session.activeFamily
  if (!session.familyKey) return null
  return {
    familyId: session.familyId || session.familyKey,
    familyKey: session.familyKey,
    name: session.familyName || '当前家庭',
    role: session.memberRole || 'parent',
  }
}

function getFamilyTitle(session) {
  if (!session) return '体验家庭'
  if (session.role === 'child') return '孩子账号'
  const activeFamily = getActiveFamily(session)
  return activeFamily ? activeFamily.name : '未加入家庭'
}

function getCustomNavPadding() {
  try {
    const menu = wx.getMenuButtonBoundingClientRect()
    if (menu && menu.bottom) return menu.bottom + 14
  } catch (err) {
    // Fall back below for old devtools/runtime versions.
  }
  try {
    const info = wx.getSystemInfoSync()
    return (info.statusBarHeight || 24) + 58
  } catch (err) {
    return 88
  }
}

function getTimerProgressDeg(seconds, totalSeconds) {
  const total = Number(totalSeconds || 0)
  if (total <= 0) return 0
  return Math.min(360, Math.max(0, Math.round((Number(seconds || 0) / total) * 360)))
}

function getFocusSetting(item) {
  const focusMode = item.focusMode === 'custom' ? 'custom' : 'pomodoro'
  const focusMinutes = Number(item.focusMinutes) > 0 ? Number(item.focusMinutes) : 25
  const breakMinutes = Number(item.breakMinutes) >= 0 ? Number(item.breakMinutes) : 5
  return {
    focusMode,
    focusMinutes,
    breakMinutes,
    focusLabel: focusMode === 'custom' ? `自定义 ${focusMinutes} 分钟` : `番茄钟 ${focusMinutes}+${breakMinutes}`,
  }
}

function completionKey(prefix, id, date) {
  return `${prefix}-${id}-${date}`
}

function weekdayLabel(value) {
  const index = WEEKDAY_VALUES.indexOf(Number(value))
  return index >= 0 ? WEEKDAY_LABELS[index] : ''
}

function courseScheduleLabel(course) {
  return formatCourseScheduleLabel(course, weekdayLabel, shortDate)
}

function buildCourseSummary(courses = [], childId, completions = {}) {
  return (courses || [])
    .filter((course) => !childId || course.childId === childId)
    .map((course) => {
      const reward = getRewardSetting(course)
      const lessonSummary = summarizeCourseLessons(course, completions)
      return {
        id: course.id,
        title: course.subject || '未命名课程',
        teacher: course.teacher || '未填写老师',
        scheduleText: courseScheduleLabel(course) || '未设置上课时间',
        lifecycleText: `${shortDate(course.startDate)} - ${shortDate(course.settlementDate)}`,
        durationText: `${course.durationMinutes || 0} 分钟`,
        rewardText: `+${reward.successPoints || 0} 积分`,
        lessonStatsText: `总 ${lessonSummary.total} 课时 · 试听 ${lessonSummary.trial} · 正式 ${lessonSummary.formal} · 赠送 ${lessonSummary.bonus}`,
        lessonCompletionText: `已完成 ${lessonSummary.completed} · 未完成 ${lessonSummary.pending}`,
      }
    })
}

function buildCourseItems(date, courses, completions) {
  return courses
    .map((course) => ({ course, session: getCourseSessionForDate(course, date) }))
    .filter((entry) => entry.session)
    .map(({ course, session }) => {
      const id = completionKey('course', course.id, date)
      const completion = normalizeCompletionRecord(completions[id])
      return Object.assign({
        id,
        sourceId: course.id,
        childId: course.childId,
        category: 'course',
        label: CATEGORY_META.course.label,
        className: CATEGORY_META.course.className,
        title: course.subject,
        date: session.date || date,
        time: session.time || course.time,
        lessonType: session.lessonType || 'formal',
        lessonTypeLabel: session.lessonTypeLabel || '正式',
        sessionSource: session.source,
        meta: `${course.teacher} · ${session.lessonTypeLabel || '正式'} · ${course.durationMinutes} 分钟`,
        completed: completion.completed,
        completionStatus: completion.status,
        completionIsMakeup: completion.isMakeup,
        completionPointsDelta: completion.pointsDelta,
      }, getFocusSetting(course), getRewardSetting(course))
    })
}

function buildHabitItems(date, habits, completions) {
  const weekday = toDate(date).getDay()
  return habits
    .filter((habit) => {
      if (habit.frequency === 'range') {
        return isInsideRange(date, habit.startDate, habit.endDate)
      }
      if (habit.frequency === 'daily') return true
      return Array.isArray(habit.weekdays) && habit.weekdays.indexOf(weekday) >= 0
    })
    .map((habit) => {
      const id = completionKey('habit', habit.id, date)
      const completionCount = Object.keys(completions || {})
        .filter((key) => key.indexOf(`habit-${habit.id}-`) === 0 && normalizeCompletionRecord(completions[key]).completed)
        .length
      const completion = normalizeCompletionRecord(completions[id])
      return Object.assign({
        id,
        sourceId: habit.id,
        childId: habit.childId,
        category: 'habit',
        label: CATEGORY_META.habit.label,
        className: CATEGORY_META.habit.className,
        title: habit.title,
        time: habit.time || '习惯',
        meta: `${habit.meta || '习惯'} · 已完成 ${habit.completionCount || completionCount} 次`,
        completionCount,
        completed: completion.completed,
        completionStatus: completion.status,
        completionIsMakeup: completion.isMakeup,
        completionPointsDelta: completion.pointsDelta,
      }, getFocusSetting(habit), getRewardSetting(habit))
    })
}

function buildTaskItems(date, tasks, completions) {
  return tasks
    .filter((task) => task.dueDate === date)
    .map((task) => {
      const id = completionKey('task', task.id, date)
      const completion = normalizeCompletionRecord(completions[id])
      return Object.assign({
        id,
        sourceId: task.id,
        childId: task.childId,
        category: 'task',
        label: CATEGORY_META.task.label,
        className: CATEGORY_META.task.className,
        title: task.title,
        time: task.time || '任务',
        meta: task.meta || '任务',
        completed: completion.completed,
        completionStatus: completion.status,
        completionIsMakeup: completion.isMakeup,
        completionPointsDelta: completion.pointsDelta,
      }, getFocusSetting(task), getRewardSetting(task))
    })
}

function buildMilestoneItems(date, milestones) {
  return milestones
    .filter((milestone) => daysBetween(date, milestone.date) >= 0)
    .map((milestone) => {
      const remainingDays = daysBetween(date, milestone.date)
      return {
        id: `milestone-${milestone.id}-${date}`,
        sourceId: milestone.id,
        category: 'milestone',
        label: CATEGORY_META.milestone.label,
        className: CATEGORY_META.milestone.className,
        title: milestone.title,
        time: `还剩 D-${remainingDays}`,
        meta: milestone.date,
        completed: false,
      }
    })
}

function sortAgenda(a, b) {
  const priority = { course: 1, habit: 2, task: 3, milestone: 4 }
  const diff = priority[a.category] - priority[b.category]
  if (diff !== 0) return diff
  if (a.time && b.time) return a.time.localeCompare(b.time)
  if (a.time) return -1
  if (b.time) return 1
  return 0
}

function buildAgenda(date, source, childId) {
  const items = [
    ...buildCourseItems(date, source.courses || [], source.completions || {}),
    ...buildHabitItems(date, source.habits || [], source.completions || {}),
    ...buildTaskItems(date, source.tasks || [], source.completions || {}),
    ...buildMilestoneItems(date, source.milestones || []),
  ]
  return items
    .filter((item) => !item.childId || item.childId === childId)
    .sort(sortAgenda)
}

function completionRate(items) {
  const completable = items.filter((item) => item.category !== 'milestone')
  const completed = completable.filter((item) => item.completed).length
  const total = completable.length
  return {
    completed,
    total,
    percent: total === 0 ? 0 : Math.round((completed / total) * 100),
  }
}

function getRateRingStyle(percent) {
  const value = Math.min(100, Math.max(0, Number(percent || 0)))
  if (value <= 0) return 'background: #f3ead2;'
  const degrees = Math.round((value / 100) * 360)
  return `background: conic-gradient(#f5a316 0deg ${degrees}deg, #f3ead2 ${degrees}deg 360deg);`
}

function summarizeCategory(items) {
  return ['habit', 'course', 'task'].map((category) => {
    const list = items.filter((item) => item.category === category)
    const total = list.length
    const completed = list.filter((item) => item.completed).length
    return {
      category,
      label: CATEGORY_META[category].label,
      color: CATEGORY_META[category].color,
      completed,
      total,
      percent: total === 0 ? 0 : Math.round((completed / total) * 100),
    }
  })
}

function summarizePoints(records) {
  return (records || []).reduce((result, record) => {
    const delta = Number(record.pointsDelta || 0)
    const isRedemption = record.sourceType === 'redemption'
    const earned = delta > 0
      ? result.earned + delta
      : (isRedemption ? result.earned : Math.max(0, result.earned + delta))
    return {
      earned,
      spent: result.spent + (isRedemption && delta < 0 ? Math.abs(delta) : 0),
      net: result.net + delta,
    }
  }, { earned: 0, spent: 0, net: 0 })
}

function buildHistoryTrend(today, source, childId) {
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(today, index - 6)
    const items = buildAgenda(date, source, childId)
    const rate = completionRate(items)
    return {
      date,
      label: index === 6 ? '今天' : shortDate(date),
      percent: rate.percent,
      completed: rate.completed,
      total: rate.total,
      barHeight: rate.total === 0 ? 8 : Math.max(8, rate.percent),
      hasData: rate.total > 0,
    }
  })
}

function summarizeHistoryTrend(trend) {
  const completed = (trend || []).reduce((sum, item) => sum + Number(item.completed || 0), 0)
  const total = (trend || []).reduce((sum, item) => sum + Number(item.total || 0), 0)
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100)
  return {
    completed,
    total,
    percent,
    value: total === 0 ? '暂无' : `${percent}%`,
    detail: total === 0 ? '近 7 天暂无安排' : `完成 ${completed} / ${total}`,
  }
}

function buildHistoryAgenda(today, source, childId) {
  return Array.from({ length: 7 }, (_, index) => addDays(today, index - 6))
    .reduce((result, date) => result.concat(buildAgenda(date, source, childId)), [])
}

function makeCalendarDays(selectedDate, source, childId) {
  const date = toDate(selectedDate)
  const first = new Date(date.getFullYear(), date.getMonth(), 1)
  const firstDay = first.getDay()
  const startOffset = -firstDay
  const start = new Date(first)
  start.setDate(first.getDate() + startOffset)

  return Array.from({ length: 35 }, (_, index) => {
    const current = new Date(start)
    current.setDate(start.getDate() + index)
    const value = formatDate(current)
    const agenda = buildAgenda(value, source, childId)
    return {
      value,
      day: current.getDate(),
      currentMonth: current.getMonth() === date.getMonth(),
      selected: value === selectedDate,
      today: value === todayString(),
      dots: summarizeCategory(agenda).filter((item) => item.total > 0).map((item) => item.color),
    }
  })
}

function makeWeekDays(selectedDate, source, childId) {
  const date = toDate(selectedDate)
  const start = new Date(date)
  const weekday = start.getDay()
  start.setDate(start.getDate() - weekday)

  return Array.from({ length: 7 }, (_, index) => {
    const current = new Date(start)
    current.setDate(start.getDate() + index)
    const value = formatDate(current)
    const agenda = buildAgenda(value, source, childId)
    return {
      value,
      label: WEEKDAY_LABELS[index],
      day: current.getDate(),
      selected: value === selectedDate,
      count: agenda.length,
      dots: summarizeCategory(agenda).filter((item) => item.total > 0).map((item) => item.color),
    }
  })
}

function getTermMonths(date) {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  if (month >= 7 && month <= 8) {
    return {
      kind: 'summer',
      title: `${year} 暑期计划`,
      subtitle: '7月-8月',
      months: [6, 7],
    }
  }
  if (month >= 2 && month <= 6) {
    return {
      kind: 'spring',
      title: `${year} 春季学期`,
      subtitle: '2月-6月',
      months: [1, 2, 3, 4, 5],
    }
  }
  return {
    kind: 'autumn',
    title: month === 1 ? `${year - 1} 秋季学期` : `${year} 秋季学期`,
    subtitle: '9月-1月',
    months: [8, 9, 10, 11, 0],
    baseYear: month === 1 ? year - 1 : year,
  }
}

function countRangeAgenda(startDate, endDate, source, childId) {
  let total = 0
  const cursor = toDate(startDate)
  const end = toDate(endDate)
  while (cursor <= end) {
    total += buildAgenda(formatDate(cursor), source, childId).length
    cursor.setDate(cursor.getDate() + 1)
  }
  return total
}

function makePeriodCards(selectedDate, source, childId, mode) {
  const date = toDate(selectedDate)
  const year = date.getFullYear()
  const month = date.getMonth()
  const termInfo = getTermMonths(date)
  const monthIndexes = mode === 'year'
    ? Array.from({ length: 12 }, (_, index) => index)
    : termInfo.months
  const baseYear = mode === 'year' ? year : (termInfo.baseYear || year)

  return monthIndexes.map((monthIndex) => {
    const itemYear = mode === 'term' && termInfo.kind === 'autumn' && monthIndex === 0 ? baseYear + 1 : baseYear
    const start = new Date(itemYear, monthIndex, 1)
    const end = new Date(itemYear, monthIndex + 1, 0)
    return {
      label: `${monthIndex + 1}月`,
      count: countRangeAgenda(formatDate(start), formatDate(end), source, childId),
      selected: itemYear === year && monthIndex === month,
    }
  })
}

function defaultGiftDraft() {
  return {
    title: '',
    description: '',
    imageUrl: '',
    pointsCost: '8',
    stock: '1',
    active: true,
  }
}

function defaultRuleDraft() {
  return {
    title: '',
    body: '',
    childId: '',
  }
}

function defaultItemDraft(selectedDate) {
  return {
    subject: '',
    teacher: '',
    title: '',
    startDate: selectedDate,
    settlementDate: selectedDate,
    dueDate: selectedDate,
    date: selectedDate,
    time: '18:30',
    durationMinutes: '60',
    focusMode: 'pomodoro',
    focusMinutes: '25',
    breakMinutes: '5',
    successPoints: '2',
    failurePoints: '0',
    allowMakeup: true,
    makeupPoints: '1',
    successRule: '完成后获得积分',
    makeupRule: '补卡完成 + 1 积分',
    failureRule: '不扣分，记录原因并安排补做',
    frequency: 'daily',
    weekdays: [],
    startDate: selectedDate,
    endDate: selectedDate,
  }
}

function applyFocusRewardToDraft(draft, item) {
  draft.focusMode = item.focusMode === 'custom' ? 'custom' : 'pomodoro'
  draft.focusMinutes = String(item.focusMinutes || 25)
  draft.breakMinutes = String(item.breakMinutes || 5)
  draft.successPoints = String(item.successPoints || 0)
  draft.failurePoints = String(item.failurePoints || 0)
  draft.allowMakeup = item.allowMakeup !== false
  draft.makeupPoints = String(item.makeupPoints ?? Math.max(0, Number(item.successPoints || 0) - 1))
  draft.successRule = item.successRule || '完成后获得积分'
  draft.makeupRule = item.makeupRule || `补卡完成 + ${draft.makeupPoints} 积分`
  draft.failureRule = item.failureRule || '不扣分，记录原因并安排补做'
  return draft
}

Page({
  data: {
    tabs: PARENT_TABS,
    activeTab: 'today',
    pageTitle: getPageTitle('parent', 'today'),
    notificationReturnTab: 'today',
    loginRole: 'parent',
    phone: '13800000000',
    code: '123456',
    childCode: 'GEGE01',
    pinCode: '2580',
    accountNickname: '',
    accountAvatarUrl: '',
    accountAvatarText: '微',
    accountRoleLabel: '家长',
    name: '',
    session: null,
    account: null,
    families: [],
    activeFamily: null,
    familyTitle: '体验家庭',
    guestSession: null,
    guestExpiryText: '',
    guestExpiredNotice: false,
    guestNoticeDismissed: false,
    guestModeStarted: false,
    guestPreviewRole: 'parent',
    guestPreviewSwitchVisible: false,
    isGuestParentPreview: true,
    isGuestChildPreview: false,
    parentChildPreviewChildId: '',
    parentChildPreviewActive: false,
    canManagePlan: false,
    needsFamilySetup: false,
    pendingGuestSavePlan: null,
    familySwitcherOpen: false,
    createFamilyFormOpen: false,
    editFamilyFormOpen: false,
    editingFamilyId: '',
    editFamilyName: '',
    swipedFamilyId: '',
    familyTouchStartX: 0,
    joinFamilyFormOpen: false,
    familyName: '我的家庭',
    inviteCode: '',
    inviteInfo: null,
    relationOptions: FAMILY_RELATION_OPTIONS,
    inviteRoleOptions: INVITE_ROLE_OPTIONS,
    memberRoleOptions: MEMBER_ROLE_OPTIONS,
    myRelationIndex: 0,
    myRelationLabel: '暂不设置',
    inviteRoleIndex: 0,
    inviteRelationIndex: 0,
    inviteRole: 'parent',
    inviteRelation: '',
    familyManageFamily: null,
    familyMembers: [],
    familyManagedChildren: [],
    isLoggedIn: true,
    isGuest: true,
    isParent: false,
    isChild: false,
    roleLabel: getRoleLabel('guest'),
    startChoiceOpen: false,
    loginFormOpen: false,
    loading: false,
    today: todayString(),
    selectedDate: todayString(),
    selectedDateLabel: shortDate(todayString()),
    selectedMonthLabel: '',
    calendarViewMode: 'month',
    calendarViewOptions: CALENDAR_VIEW_OPTIONS,
    children: [],
    selectedChildId: '',
    selectedChild: null,
    selectedChildPoints: 0,
    courses: [],
    habits: [],
    tasks: [],
    milestones: [],
    completions: {},
    gifts: [],
    redemptions: [],
    pointLedger: [],
    visiblePointLedger: [],
    ledgerDetailOpen: false,
    ledgerDetail: null,
    rules: [],
    todayAgenda: [],
    selectedAgenda: [],
    courseSummary: [],
    calendarDays: [],
    weekDays: [],
    periodCards: [],
    periodTitle: '',
    periodSubtitle: '',
    completionRate: { completed: 0, total: 0, percent: 0 },
    summaryCardVisible: false,
    summaryRateLabel: '今日完成率',
    rateRingStyle: getRateRingStyle(0),
    historyTrend: [],
    historySummary: { completed: 0, total: 0, percent: 0, value: '暂无', detail: '近 7 天暂无安排' },
    categoryStats: [],
    pointSummary: { earned: 0, spent: 0, net: 0 },
    visibleRules: [],
    giftCards: [],
    childRedemptions: [],
    notifications: [],
    notificationCount: 0,
    readNotificationIds: {},
    wechatReminderLoading: false,
    wechatReminderTemplates: { daily: '', deadline: '' },
    wechatReminderStatus: { daily: '未开启', deadline: '未开启' },
    grades: GRADES,
    profileEditing: false,
    profileDraft: { name: '', grade: '' },
    profileGradeIndex: 0,
    giftFormOpen: false,
    editingGiftId: '',
    giftDraft: defaultGiftDraft(),
    imageCompressing: false,
    giftCanvasWidth: 1,
    giftCanvasHeight: 1,
    ruleFormOpen: false,
    editingRuleId: '',
    ruleScope: 'common',
    ruleDraft: defaultRuleDraft(),
    itemFormOpen: false,
    itemFormKind: 'tasks',
    itemFormKindLabel: '任务',
    itemFormTitle: '添加任务',
    editingItemId: '',
    itemDraft: defaultItemDraft(todayString()),
    itemWeekdayIndex: 0,
    itemWeekdays: [],
    itemWeekdayTimes: {},
    itemWeekdayLessonTypes: {},
    itemWeekdaySchedules: [],
    itemExtraSessions: [],
    courseSessionFormOpen: false,
    courseSessionDraft: null,
    weekdayOptions: makeWeekdayOptions([]),
    weekdayLabels: WEEKDAY_LABELS,
    gradeOptions: GRADES,
    timerOpen: false,
    timerItemTitle: '',
    timerSeconds: 25 * 60,
    timerTotalSeconds: 25 * 60,
    timerDisplay: '25:00',
    timerBreakMinutes: 5,
    timerStatus: 'ready',
    timerStatusLabel: '准备开始',
    timerHint: '准备开始',
    timerProgressDeg: 360,
    defaultFocusMinutes: '25',
    defaultBreakMinutes: '5',
    defaultFocusDisplay: '25:00',
    customNavPadding: 88,
  },

  onLoad(options = {}) {
    const session = sanitizeSessionForRender(wx.getStorageSync(SESSION_KEY) || null)
    const guestSession = wx.getStorageSync(GUEST_SESSION_KEY) || null
    const role = session && session.role ? session.role : 'guest'
    const activeFamily = getActiveFamily(session)
    const today = todayString()
    const inviteCode = decodeInviteCode(options && options.inviteCode)
    const shouldCompleteProfile = needsWechatProfile(session)
    this.setData({
      session,
      account: session && session.account ? session.account : null,
      accountNickname: session && session.account && session.account.nickname ? session.account.nickname : '',
      accountAvatarUrl: session && session.account && session.account.avatarUrl ? getRenderableAccountAvatarUrl(session.account.avatarUrl) : '',
      accountAvatarText: getAccountInitial(session && session.account && session.account.nickname ? session.account.nickname : ''),
      families: session && Array.isArray(session.families) ? session.families : activeFamily ? [activeFamily] : [],
      activeFamily,
      familyTitle: getFamilyTitle(session),
      isLoggedIn: true,
      isGuest: !session,
      isParent: session && session.role === 'parent',
      isChild: session && session.role === 'child',
      roleLabel: getRoleLabel(role),
      tabs: getTabsForRole(role),
      pageTitle: getPageTitle(role, 'today'),
      guestPreviewRole: 'parent',
      parentChildPreviewChildId: '',
      parentChildPreviewActive: false,
      today,
      selectedDate: today,
      selectedDateLabel: shortDate(today),
      itemDraft: defaultItemDraft(today),
      guestNoticeDismissed: Boolean(wx.getStorageSync(GUEST_NOTICE_DISMISSED_KEY)),
      customNavPadding: getCustomNavPadding(),
      loginFormOpen: false,
      familySwitcherOpen: Boolean(session) && !shouldCompleteProfile && shouldOpenFamilySwitcherOnEntry(session),
      joinFamilyFormOpen: Boolean(inviteCode && session && session.account),
      inviteCode,
    })
    this.runAfterFirstRender(() => {
      if (!session && !guestSession) {
        this.restoreWechatSessionOnStart()
        return
      }
      this.fetchPlan()
    })
  },

  onUnload() {
    this.clearTimer()
  },

  runAfterFirstRender(callback) {
    const run = () => {
      if (typeof callback === 'function') callback()
    }
    if (wx.nextTick) {
      wx.nextTick(run)
      return
    }
    setTimeout(run, 0)
  },

  onShareAppMessage() {
    const inviteInfo = this.data.inviteInfo
    if (inviteInfo && inviteInfo.inviteCode) {
      const title = inviteInfo.role === 'child' && inviteInfo.childName
        ? `${inviteInfo.familyName || '我的家庭'} 邀请 ${inviteInfo.childName} 绑定微信`
        : `${inviteInfo.familyName || '我的家庭'} 邀请你加入伴学点滴`
      return {
        title,
        path: `/pages/family-plan/index?inviteCode=${encodeURIComponent(inviteInfo.inviteCode)}`,
      }
    }
    return {
      title: '伴学点滴家庭计划',
      path: '/pages/family-plan/index',
    }
  },

  switchLoginRole(event) {
    const role = event.currentTarget.dataset.role
    this.setData({ loginRole: role })
  },

  switchGuestPreviewRole(event) {
    const role = event.currentTarget.dataset.role === 'child' ? 'child' : 'parent'
    this.refreshView({ guestPreviewRole: role, activeTab: 'today' })
  },

  previewFamilyChild(event) {
    const childId = event.currentTarget.dataset.childId || ''
    if (!childId) return
    this.refreshView({
      parentChildPreviewChildId: childId,
      selectedChildId: childId,
      familySwitcherOpen: false,
      activeTab: 'today',
    })
  },

  returnToParentView() {
    this.refreshView({
      parentChildPreviewChildId: '',
      activeTab: 'today',
    })
  },

  onLoginInput(event) {
    const field = event.currentTarget.dataset.field
    this.setData({ [field]: event.detail.value })
  },

  onAccountNicknameInput(event) {
    this.setData({
      accountNickname: event.detail.value,
      accountAvatarText: getAccountInitial(event.detail.value),
    })
  },

  async onAccountAvatarChoose(event) {
    const avatarUrl = event.detail.avatarUrl
    this.setData({ accountAvatarUrl: avatarUrl })
    try {
      this.accountAvatarPayload = await this.prepareAccountAvatarUrl(avatarUrl)
    } catch (err) {
      this.accountAvatarPayload = ''
      wx.showToast({ title: '头像读取失败，请重试', icon: 'none' })
    }
  },

  prepareAccountAvatarUrl(avatarUrl) {
    if (getRenderableAccountAvatarUrl(avatarUrl)) {
      return Promise.resolve(avatarUrl)
    }
    if (!avatarUrl || !wx.getFileSystemManager) {
      return Promise.resolve('')
    }
    const fs = wx.getFileSystemManager()
    return new Promise((resolve, reject) => {
      fs.readFile({
        filePath: avatarUrl,
        encoding: 'base64',
        success: (result) => resolve(`data:image/jpeg;base64,${result.data}`),
        fail: reject,
      })
    })
  },

  async confirmAccountProfileBeforeLogin() {
    if (String(this.data.accountNickname || '').trim() && this.data.accountAvatarUrl) return true
    return new Promise((resolve) => {
      wx.showModal({
        title: '设置头像昵称',
        content: '微信不会自动提供头像昵称。建议先点头像和昵称输入框选择资料，方便家人识别。',
        confirmText: '继续登录',
        cancelText: '去设置',
        success: (res) => resolve(Boolean(res.confirm)),
        fail: () => resolve(false),
      })
    })
  },

  async openLoginForm() {
    const restored = await this.restoreWechatSessionFromAction()
    if (restored) return
    this.setData({ loginFormOpen: true })
  },

  closeLoginForm() {
    if (!this.data.session && !this.data.guestSession && !wx.getStorageSync(GUEST_SESSION_KEY)) {
      this.chooseGuestMode()
      return
    }
    this.setData({ loginFormOpen: false })
  },

  openAccountProfileForm() {
    this.setData({
      loginFormOpen: true,
      familySwitcherOpen: false,
    })
  },

  chooseGuestMode() {
    this.setData({
      startChoiceOpen: false,
      loginFormOpen: false,
      isLoggedIn: true,
      isGuest: true,
      isParent: false,
      isChild: false,
      guestModeStarted: true,
      guestPreviewRole: 'parent',
      parentChildPreviewChildId: '',
      parentChildPreviewActive: false,
      isGuestParentPreview: true,
      isGuestChildPreview: false,
      roleLabel: getRoleLabel('guest'),
      tabs: getTabsForRole('guest'),
      pageTitle: getPageTitle('guest', 'today'),
      familyTitle: '体验家庭',
    })
    this.fetchPlan()
  },

  async chooseLoginMode() {
    this.setData({ startChoiceOpen: false })
    await this.openLoginForm()
  },

  applySession(session, extraPatch = {}) {
    const renderSession = sanitizeSessionForRender(session)
    const role = renderSession && renderSession.role ? renderSession.role : 'guest'
    const account = renderSession && renderSession.account ? renderSession.account : null
    const activeFamily = getActiveFamily(renderSession)
    const families = renderSession && Array.isArray(renderSession.families) ? renderSession.families : activeFamily ? [activeFamily] : []
    this.accountAvatarPayload = ''
    wx.setStorageSync(SESSION_KEY, renderSession)
    this.setData(Object.assign({
      session: renderSession,
      account,
      accountNickname: account && account.nickname ? account.nickname : this.data.accountNickname,
      accountAvatarUrl: account && account.avatarUrl ? getRenderableAccountAvatarUrl(account.avatarUrl) : this.data.accountAvatarUrl,
      accountAvatarText: getAccountInitial(account && account.nickname ? account.nickname : this.data.accountNickname),
      name: renderSession && renderSession.name ? renderSession.name : this.data.name,
      families,
      activeFamily,
      familyTitle: getFamilyTitle(renderSession),
      isLoggedIn: true,
      isGuest: !renderSession,
      isParent: role === 'parent',
      isChild: role === 'child',
      guestModeStarted: false,
      guestPreviewRole: 'parent',
      parentChildPreviewChildId: '',
      parentChildPreviewActive: false,
      guestPreviewSwitchVisible: false,
      isGuestParentPreview: false,
      isGuestChildPreview: false,
      roleLabel: getRoleLabel(role),
      startChoiceOpen: false,
      tabs: getTabsForRole(role),
      activeTab: 'today',
      pageTitle: getPageTitle(role, 'today'),
      selectedChildId: renderSession && renderSession.childId ? renderSession.childId : this.data.selectedChildId,
      loginFormOpen: false,
      familySwitcherOpen: false,
      createFamilyFormOpen: false,
      editFamilyFormOpen: false,
      joinFamilyFormOpen: false,
    }, extraPatch))
  },

  getWechatLoginCode() {
    return new Promise((resolve, reject) => {
      wx.login({
        success: (res) => {
          if (res && res.code) {
            resolve(res.code)
            return
          }
          reject(new Error('微信登录失败'))
        },
        fail: reject,
      })
    })
  },

  isWechatRestoreStillCurrent() {
    return !this.data.session
      && !this.data.guestModeStarted
      && !wx.getStorageSync(SESSION_KEY)
      && !wx.getStorageSync(GUEST_SESSION_KEY)
  },

  async restoreWechatSessionOnStart() {
    this.setData({ loading: true })
    try {
      const code = await this.getWechatLoginCode()
      const session = await api.restoreWechatSession({ code })
      if (!this.isWechatRestoreStillCurrent()) return
      if (session && session.token) {
        const shouldCompleteProfile = needsWechatProfile(session)
        this.applySession(session, {
          selectedChildId: session.childId || '',
          loginFormOpen: false,
          familySwitcherOpen: !shouldCompleteProfile && shouldOpenFamilySwitcherOnEntry(session),
        })
        await this.fetchPlan()
        return
      }
      if (this.isWechatRestoreStillCurrent()) {
        this.chooseGuestMode()
      }
    } catch (err) {
      if (this.isWechatRestoreStillCurrent()) {
        this.chooseGuestMode()
      }
    } finally {
      if (!this.data.session) {
        this.setData({ loading: false })
      }
    }
  },

  async restoreWechatSessionFromAction() {
    const pendingGuestPlan = this.getStoredGuestPlan()
    this.setData({ loading: true })
    try {
      const code = await this.getWechatLoginCode()
      const session = await api.restoreWechatSession({ code })
      if (session && session.token) {
        const shouldCompleteProfile = needsWechatProfile(session)
        this.applySession(session, {
          selectedChildId: session.childId || '',
          loginFormOpen: false,
          familySwitcherOpen: !shouldCompleteProfile && shouldOpenFamilySwitcherOnEntry(session),
          pendingGuestSavePlan: hasGuestPlanData(pendingGuestPlan) ? pendingGuestPlan : this.data.pendingGuestSavePlan,
        })
        await this.fetchPlan()
        if (!this.data.activeFamily && hasGuestPlanData(pendingGuestPlan)) {
          const keepGuestPlan = await this.confirmPendingGuestPlanWithoutFamily(pendingGuestPlan)
          if (keepGuestPlan) {
            this.setData({ pendingGuestSavePlan: pendingGuestPlan })
            wx.showToast({ title: '创建或加入家庭后可保存', icon: 'none' })
          }
        } else {
          await this.maybeOfferGuestPlanSave(pendingGuestPlan)
        }
        return true
      }
    } catch (err) {
      // Fall through to the explicit first-time login form.
    } finally {
      if (!this.data.session) {
        this.setData({ loading: false })
      }
    }
    return false
  },

  async loginWithWechat() {
    const profileConfirmed = await this.confirmAccountProfileBeforeLogin()
    if (!profileConfirmed) return
    const pendingGuestPlan = this.getStoredGuestPlan()
    this.setData({ loading: true })
    try {
      const code = await this.getWechatLoginCode()
      const session = await api.loginWechat({
        code,
        nickname: String(this.data.accountNickname || '').trim(),
        avatarUrl: this.accountAvatarPayload || getRenderableAccountAvatarUrl(this.data.accountAvatarUrl),
      })
      this.applySession(session, {
        selectedChildId: session.childId || '',
        familySwitcherOpen: shouldOpenFamilySwitcherOnEntry(session),
      })
      wx.showToast({ title: session.activeFamily ? '登录成功' : '微信登录成功', icon: 'none' })
      await this.fetchPlan()
      if (!this.data.activeFamily && hasGuestPlanData(pendingGuestPlan)) {
        const keepGuestPlan = await this.confirmPendingGuestPlanWithoutFamily(pendingGuestPlan)
        if (keepGuestPlan) {
          this.setData({ pendingGuestSavePlan: pendingGuestPlan })
          wx.showToast({ title: '创建或加入家庭后可保存', icon: 'none' })
        }
        return
      }
      await this.maybeOfferGuestPlanSave(pendingGuestPlan)
    } catch (err) {
      this.showError(err, '微信登录失败')
    } finally {
      this.setData({ loading: false })
    }
  },

  async submitLogin() {
    if (this.data.loginRole === 'parent') {
      await this.loginWithWechat()
      return
    }
    this.setData({ loading: true })
    try {
      const session = await api.loginChild({ childCode: this.data.childCode, pinCode: this.data.pinCode })
      this.applySession(session, {
        selectedChildId: session.childId || this.data.selectedChildId,
      })
      wx.showToast({ title: '登录成功', icon: 'success' })
      await this.fetchPlan()
    } catch (err) {
      this.showError(err, '登录失败')
    } finally {
      this.setData({ loading: false })
    }
  },

  logout() {
    this.clearTimer()
    wx.removeStorageSync(SESSION_KEY)
    this.setData({
      session: null,
      isLoggedIn: true,
      isGuest: true,
      isParent: false,
      isChild: false,
      guestModeStarted: false,
      guestPreviewRole: 'parent',
      guestPreviewSwitchVisible: false,
      isGuestParentPreview: true,
      isGuestChildPreview: false,
      account: null,
      families: [],
      activeFamily: null,
      familyTitle: '体验家庭',
      activeTab: 'today',
      tabs: PARENT_TABS,
      pageTitle: getPageTitle('guest', 'today'),
      roleLabel: getRoleLabel('guest'),
      startChoiceOpen: true,
      loginFormOpen: false,
      familySwitcherOpen: false,
      createFamilyFormOpen: false,
      editFamilyFormOpen: false,
      editingFamilyId: '',
      editFamilyName: '',
      swipedFamilyId: '',
      joinFamilyFormOpen: false,
      pendingGuestSavePlan: null,
      inviteInfo: null,
      children: [],
      selectedChildId: '',
      selectedChild: null,
      selectedChildPoints: 0,
      courses: [],
      habits: [],
      tasks: [],
      milestones: [],
      completions: {},
      gifts: [],
      redemptions: [],
      pointLedger: [],
      rules: [],
      notifications: [],
      notificationCount: 0,
    })
  },

  getOrCreateGuestSession() {
    const now = Date.now()
    let guestSession = wx.getStorageSync(GUEST_SESSION_KEY) || null
    let expired = false
    if (isGuestExpired(guestSession, now)) {
      expired = Boolean(guestSession)
      guestSession = createGuestSession(now)
      wx.setStorageSync(GUEST_SESSION_KEY, guestSession)
      wx.removeStorageSync(GUEST_PLAN_KEY)
      wx.removeStorageSync(GUEST_NOTICE_DISMISSED_KEY)
    }
    this.setData({
      guestSession,
      guestExpiryText: getGuestExpiryText(guestSession, now),
      guestExpiredNotice: expired,
      guestNoticeDismissed: expired ? false : Boolean(wx.getStorageSync(GUEST_NOTICE_DISMISSED_KEY)),
    })
    return { guestSession, expired }
  },

  dismissGuestExpiryCard() {
    wx.setStorageSync(GUEST_NOTICE_DISMISSED_KEY, true)
    this.setData({ guestNoticeDismissed: true })
  },

  getStoredGuestPlan() {
    return wx.getStorageSync(GUEST_PLAN_KEY) || null
  },

  storeGuestPlan(plan) {
    wx.setStorageSync(GUEST_PLAN_KEY, {
      children: plan.children || [],
      courses: plan.courses || [],
      habits: plan.habits || [],
      tasks: plan.tasks || [],
      milestones: plan.milestones || [],
      completions: plan.completions || {},
      gifts: plan.gifts || [],
      redemptions: plan.redemptions || [],
      pointLedger: plan.pointLedger || [],
      rules: plan.rules || [],
    })
  },

  clearGuestLocalData() {
    wx.removeStorageSync(GUEST_PLAN_KEY)
    wx.removeStorageSync(GUEST_SESSION_KEY)
    wx.removeStorageSync(GUEST_NOTICE_DISMISSED_KEY)
    this.setData({
      guestSession: null,
      guestExpiryText: '',
      guestExpiredNotice: false,
      guestNoticeDismissed: false,
      pendingGuestSavePlan: null,
    })
    wx.showToast({ title: '游客数据已清空', icon: 'success' })
    if (this.data.isGuest) {
      this.logout()
    }
  },

  currentGuestPlan(patch = {}) {
    return Object.assign({
      children: this.data.children || [],
      courses: this.data.courses || [],
      habits: this.data.habits || [],
      tasks: this.data.tasks || [],
      milestones: this.data.milestones || [],
      completions: this.data.completions || {},
      gifts: this.data.gifts || [],
      redemptions: this.data.redemptions || [],
      pointLedger: this.data.pointLedger || [],
      rules: this.data.rules || [],
    }, patch)
  },

  refreshGuestPlan(patch) {
    const plan = this.currentGuestPlan(patch)
    this.storeGuestPlan(plan)
    this.refreshView(plan)
  },

  createDefaultGuestChild() {
    if (!this.data.isGuest) return
    if ((this.data.children || []).length > 0) return
    const child = defaultGuestChild()
    const children = [child]
    this.refreshGuestPlan({ children, selectedChildId: child.id })
    wx.showToast({ title: '已创建临时孩子', icon: 'success' })
  },

  async maybeOfferGuestPlanSave(pendingGuestPlan) {
    const guestPlan = pendingGuestPlan || this.getStoredGuestPlan()
    if (!hasGuestPlanData(guestPlan)) return
    if (!this.data.session || this.data.session.role !== 'parent' || !this.data.activeFamily) return
    const action = await this.chooseGuestPlanAction()
    if (action === 'clear') {
      this.clearGuestLocalData()
      return
    }
    if (action !== 'save') return
    this.setData({ loading: true })
    try {
      await this.saveGuestPlanToFamily(guestPlan)
      wx.removeStorageSync(GUEST_PLAN_KEY)
      wx.removeStorageSync(GUEST_SESSION_KEY)
      wx.removeStorageSync(GUEST_NOTICE_DISMISSED_KEY)
      this.setData({ pendingGuestSavePlan: null })
      wx.showToast({ title: '已保存到家庭', icon: 'success' })
      await this.fetchPlan()
    } catch (err) {
      this.showError(err, '游客数据保存失败')
    } finally {
      this.setData({ loading: false })
    }
  },

  chooseGuestPlanAction() {
    return new Promise((resolve) => {
      wx.showActionSheet({
        itemList: ['保存到当前家庭', '不保存，清空本地数据', '稍后处理'],
        success: (res) => {
          if (res.tapIndex === 0) resolve('save')
          else if (res.tapIndex === 1) resolve('clear')
          else resolve('later')
        },
        fail: () => resolve('later'),
      })
    })
  },

  async confirmPendingGuestPlanWithoutFamily(guestPlan) {
    if (!hasGuestPlanData(guestPlan)) return false
    const keep = await new Promise((resolve) => {
      wx.showModal({
        title: '检测到游客数据',
        content: '当前账号还没有家庭。可以保留游客数据，创建或加入家庭后再保存；也可以直接清空。',
        confirmText: '保留待保存',
        cancelText: '清空',
        success: (res) => resolve(Boolean(res.confirm)),
        fail: () => resolve(false),
      })
    })
    if (!keep) {
      this.clearGuestLocalData()
      return false
    }
    return true
  },

  async savePendingGuestPlanAfterFamilySetup(fallbackPlan) {
    const guestPlan = this.data.pendingGuestSavePlan || fallbackPlan || this.getStoredGuestPlan()
    if (!hasGuestPlanData(guestPlan)) return false
    if (!this.data.session || this.data.session.role !== 'parent' || !this.data.activeFamily) return false
    try {
      await this.saveGuestPlanToFamily(guestPlan)
      wx.removeStorageSync(GUEST_PLAN_KEY)
      wx.removeStorageSync(GUEST_SESSION_KEY)
      wx.removeStorageSync(GUEST_NOTICE_DISMISSED_KEY)
      this.setData({ pendingGuestSavePlan: null })
      wx.showToast({ title: '游客数据已保存', icon: 'success' })
      await this.fetchPlan()
      return true
    } catch (err) {
      this.showError(err, '游客数据保存失败')
      return null
    }
  },

  async saveGuestPlanToFamily(plan) {
    const session = this.data.session
    const familyChildren = this.data.children || []
    const makeImportKey = (...parts) => parts
      .map((part) => String(part === undefined || part === null ? '' : part).trim().replace(/\s+/g, ' '))
      .join('|')
    const findExistingImportItem = (items, targetKey, makeKey) => (items || []).find((item) => makeKey(item) === targetKey) || null
    const childIdMap = {}
    const makeChildKey = (child) => makeImportKey(child.name, child.grade, child.avatar)
    const firstFamilyChildId = familyChildren[0] ? familyChildren[0].id : ''
    const selectedFamilyChildId = familyChildren.some((child) => child.id === this.data.selectedChildId) ? this.data.selectedChildId : ''
    for (let index = 0; index < (plan.children || []).length; index += 1) {
      const child = plan.children[index]
      const existingChild = findExistingImportItem(familyChildren, makeChildKey(child), makeChildKey)
      if (existingChild) {
        childIdMap[child.id] = existingChild.id
        continue
      }
      if (isDefaultGuestChild(child) && firstFamilyChildId) {
        childIdMap[child.id] = selectedFamilyChildId || firstFamilyChildId
        continue
      }
      const created = await api.createChildProfile({
        name: child.name,
        avatar: child.avatar,
        grade: child.grade,
      }, session)
      childIdMap[child.id] = created.id
      familyChildren.push(created)
    }
    const fallbackChildId = childIdMap[this.data.selectedChildId] || this.data.selectedChildId || (familyChildren[0] && familyChildren[0].id) || ''
    const hasFamilyChild = (childId) => familyChildren.some((child) => child.id === childId)
    const resolveChildId = (childId) => childIdMap[childId] || (hasFamilyChild(childId) ? childId : fallbackChildId)
    const hasChildBoundItems = ['courses', 'habits', 'tasks'].some((key) => (plan[key] || []).length > 0)
      || (plan.rules || []).some((item) => item.childId)
      || (plan.redemptions || []).some((item) => item.childId)
    if (hasChildBoundItems && !fallbackChildId) {
      throw new Error('家庭里还没有孩子，先创建孩子后再保存游客数据')
    }

    const itemIdMap = {}
    const giftIdMap = {}
    const makeCourseKey = (item) => makeImportKey(item.childId, item.subject, item.teacher, item.startDate, item.settlementDate, item.weekday, item.time, item.durationMinutes)
    const makeHabitKey = (item) => makeImportKey(item.childId, item.title, item.frequency)
    const makeTaskKey = (item) => makeImportKey(item.childId, item.title, item.dueDate, item.time)
    const makeMilestoneKey = (item) => makeImportKey(item.title, item.date)
    const makeGiftKey = (item) => makeImportKey(item.title, item.description, item.pointsCost)
    const makeRuleKey = (item) => makeImportKey(item.childId, item.title, item.body)
    const createChildItems = async (kind, prefix, items) => {
      const existingItems = this.data[kind] || []
      const makeKey = prefix === 'course' ? makeCourseKey : prefix === 'habit' ? makeHabitKey : makeTaskKey
      for (let index = 0; index < (items || []).length; index += 1) {
        const item = items[index]
        const childId = resolveChildId(item.childId)
        if (!childId) continue
        const payload = Object.assign({}, item, { childId })
        delete payload.id
        const existingItem = findExistingImportItem(existingItems, makeKey(payload), makeKey)
        if (existingItem) {
          itemIdMap[`${prefix}:${item.id}`] = existingItem.id
          continue
        }
        const created = await api.createPlanItem(kind, payload, session)
        itemIdMap[`${prefix}:${item.id}`] = created.id
      }
    }

    await createChildItems('courses', 'course', plan.courses)
    await createChildItems('habits', 'habit', plan.habits)
    await createChildItems('tasks', 'task', plan.tasks)

    for (let index = 0; index < (plan.milestones || []).length; index += 1) {
      const item = plan.milestones[index]
      const existingMilestone = findExistingImportItem(this.data.milestones, makeMilestoneKey(item), makeMilestoneKey)
      if (existingMilestone) continue
      await api.createPlanItem('milestones', {
        title: item.title,
        date: item.date,
      }, session)
    }

    for (let index = 0; index < (plan.gifts || []).length; index += 1) {
      const item = plan.gifts[index]
      const existingGift = findExistingImportItem(this.data.gifts, makeGiftKey(item), makeGiftKey)
      if (existingGift) {
        giftIdMap[item.id] = existingGift.id
        continue
      }
      const created = await api.createGift({
        title: item.title,
        description: item.description || '',
        imageUrl: item.imageUrl || '',
        pointsCost: Number(item.pointsCost || 0),
        stock: Number(item.stock || 0),
        active: item.active !== false,
      }, session)
      giftIdMap[item.id] = created.id
    }

    for (let index = 0; index < (plan.rules || []).length; index += 1) {
      const item = plan.rules[index]
      const payload = {
        title: item.title,
        body: item.body,
        childId: item.childId ? resolveChildId(item.childId) : '',
      }
      const existingRule = findExistingImportItem(this.data.rules, makeRuleKey(payload), makeRuleKey)
      if (existingRule) continue
      await api.createRule(payload, session)
    }

    const completionEntries = Object.keys(plan.completions || {})
    for (let index = 0; index < completionEntries.length; index += 1) {
      const guestKey = completionEntries[index]
      const completion = normalizeCompletionRecord(plan.completions[guestKey])
      if (!completion.completed) continue
      const match = guestKey.match(/^(course|habit|task)-(.+)-(\d{4}-\d{2}-\d{2})$/)
      if (!match) continue
      const nextId = itemIdMap[`${match[1]}:${match[2]}`]
      if (!nextId) continue
      await api.updateCompletion(`${match[1]}-${nextId}-${match[3]}`, true, session, { isMakeup: completion.isMakeup })
    }

    for (let index = 0; index < (plan.redemptions || []).length; index += 1) {
      const item = plan.redemptions[index]
      const giftId = giftIdMap[item.giftId]
      const childId = resolveChildId(item.childId)
      if (!giftId || !childId) continue
      const created = await api.createRedemption({ giftId, childId }, session)
      if (item.status === 'approved' || item.status === 'rejected') {
        await api.updateRedemptionStatus(created.id, item.status, session)
      }
    }
  },

  async ensureActiveFamilySession() {
    const session = this.data.session
    if (!session || session.role !== 'parent' || session.familyKey) return false
    const result = await api.listFamilies(session)
    const families = result.families || []
    const activeFamily = result.activeFamily || families[0] || this.data.activeFamily || getActiveFamily(session)
    if (!activeFamily) {
      const nextSession = Object.assign({}, session, {
        families,
        activeFamily: null,
        familyId: '',
        familyKey: '',
      })
      wx.setStorageSync(SESSION_KEY, nextSession)
      this.setData({
        session: nextSession,
        families,
        activeFamily: null,
        familyTitle: getFamilyTitle(nextSession),
      })
      return false
    }
    const familyIdentity = activeFamily.familyId || activeFamily.id || activeFamily.familyKey
    if (!familyIdentity) return false
    const switchedSession = await api.switchFamily(familyIdentity, session)
    this.applySession(switchedSession)
    return true
  },

  async loadFamilies() {
    if (!this.data.session || !this.data.account) return
    const result = await api.listFamilies(this.data.session)
    const families = result.families || []
    const activeFamily = result.activeFamily || families.find((item) => {
      const current = this.data.activeFamily || {}
      return item.familyId === current.familyId || item.familyKey === current.familyKey
    }) || null
    const session = Object.assign({}, this.data.session, {
      families,
      activeFamily,
      familyKey: activeFamily ? activeFamily.familyKey : '',
    })
    wx.setStorageSync(SESSION_KEY, session)
    this.setData({
      session,
      families,
      activeFamily,
      familyTitle: getFamilyTitle(session),
    })
  },

  async loadFamilyManagementInfo() {
    if (!this.data.session || !this.data.activeFamily) {
      this.setData({
        familyManageFamily: null,
        familyMembers: [],
        familyManagedChildren: [],
      })
      return
    }
    const result = await api.getCurrentFamilyMembers(this.data.session)
    const rawMembers = result.members || []
    const rawCurrentMember = rawMembers.find((member) => member.isCurrentAccount) || null
    const canManageMemberRoles = Boolean(rawCurrentMember && rawCurrentMember.role === 'owner')
    const familyMembers = rawMembers.map((member) => decorateFamilyMember(member, canManageMemberRoles))
    const currentMember = familyMembers.find((member) => member.isCurrentAccount) || null
    const myRelationIndex = findOptionIndex(FAMILY_RELATION_OPTIONS, currentMember && currentMember.relation)
    this.setData({
      familyManageFamily: result.family || this.data.activeFamily,
      familyMembers,
      myRelationIndex,
      myRelationLabel: FAMILY_RELATION_OPTIONS[myRelationIndex].label,
      familyManagedChildren: (result.children || []).map(decorateFamilyManagedChild),
    })
  },

  async openFamilySwitcher() {
    if (!this.data.account) {
      this.openLoginForm()
      return
    }
    try {
      await this.loadFamilies()
      await this.loadFamilyManagementInfo()
    } catch (err) {
      this.showError(err, '家庭列表加载失败')
      return
    }
    this.setData({ familySwitcherOpen: true, inviteInfo: null })
  },

  closeFamilySwitcher() {
    this.setData({ familySwitcherOpen: false, inviteInfo: null, swipedFamilyId: '' })
  },

  copyFamilyKey() {
    const family = this.data.familyManageFamily || this.data.activeFamily
    if (!family || !family.familyKey) {
      wx.showToast({ title: '暂无家庭 ID', icon: 'none' })
      return
    }
    if (wx.setClipboardData) {
      wx.setClipboardData({ data: family.familyKey })
    }
  },

  copyInviteCode() {
    if (!this.data.inviteInfo || !this.data.inviteInfo.inviteCode) {
      wx.showToast({ title: '请先生成邀请码', icon: 'none' })
      return
    }
    if (wx.setClipboardData) {
      wx.setClipboardData({ data: this.data.inviteInfo.inviteCode })
    }
  },

  async onMyRelationChange(event) {
    const index = Number(event.detail.value || 0)
    const option = FAMILY_RELATION_OPTIONS[index] || FAMILY_RELATION_OPTIONS[0]
    this.setData({ myRelationIndex: index, myRelationLabel: option.label })
    this.setData({ loading: true })
    try {
      await api.updateCurrentFamilyMember({ relation: option.value }, this.data.session)
      await this.loadFamilyManagementInfo()
      wx.showToast({ title: '家庭身份已更新', icon: 'success' })
    } catch (err) {
      this.showError(err, '更新家庭身份失败')
      await this.loadFamilyManagementInfo()
    } finally {
      this.setData({ loading: false })
    }
  },

  async onMemberRelationChange(event) {
    const memberId = event.currentTarget.dataset.memberId
    const index = Number(event.detail.value || 0)
    const option = FAMILY_RELATION_OPTIONS[index] || FAMILY_RELATION_OPTIONS[0]
    if (!memberId) return
    this.setData({ loading: true })
    try {
      await api.updateFamilyMember(memberId, { relation: option.value }, this.data.session)
      await this.loadFamilyManagementInfo()
      wx.showToast({ title: '成员身份已更新', icon: 'success' })
    } catch (err) {
      this.showError(err, '更新成员身份失败')
      await this.loadFamilyManagementInfo()
    } finally {
      this.setData({ loading: false })
    }
  },

  async onMemberRoleChange(event) {
    const memberId = event.currentTarget.dataset.memberId
    const index = Number(event.detail.value || 0)
    const option = MEMBER_ROLE_OPTIONS[index] || MEMBER_ROLE_OPTIONS[1]
    if (!memberId) return
    this.setData({ loading: true })
    try {
      await api.updateFamilyMemberRole(memberId, { role: option.value }, this.data.session)
      await this.loadFamilyManagementInfo()
      wx.showToast({ title: '成员角色已更新', icon: 'success' })
    } catch (err) {
      this.showError(err, '更新成员角色失败')
      await this.loadFamilyManagementInfo()
    } finally {
      this.setData({ loading: false })
    }
  },

  onInviteRoleChange(event) {
    const index = Number(event.detail.value || 0)
    const option = INVITE_ROLE_OPTIONS[index] || INVITE_ROLE_OPTIONS[0]
    this.setData({
      inviteRoleIndex: index,
      inviteRole: option.value,
      inviteInfo: null,
    })
  },

  onInviteRelationChange(event) {
    const index = Number(event.detail.value || 0)
    const option = FAMILY_RELATION_OPTIONS[index] || FAMILY_RELATION_OPTIONS[0]
    this.setData({
      inviteRelationIndex: index,
      inviteRelation: option.value,
      inviteInfo: null,
    })
  },

  openCreateFamilyForm() {
    if (!this.data.account) {
      this.openLoginForm()
      return
    }
    this.setData({
      familySwitcherOpen: false,
      createFamilyFormOpen: true,
      familyName: this.data.familyName || '我的家庭',
    })
  },

  closeCreateFamilyForm() {
    this.setData({ createFamilyFormOpen: false })
  },

  openEditFamilyForm(event) {
    const familyId = event.currentTarget.dataset.id || (this.data.activeFamily && this.data.activeFamily.familyId) || ''
    const familyName = event.currentTarget.dataset.name || (this.data.activeFamily && this.data.activeFamily.name) || ''
    if (!familyId) {
      wx.showToast({ title: '请选择家庭', icon: 'none' })
      return
    }
    this.setData({
      familySwitcherOpen: false,
      editFamilyFormOpen: true,
      editingFamilyId: familyId,
      editFamilyName: familyName || '我的家庭',
      swipedFamilyId: '',
    })
  },

  closeEditFamilyForm() {
    this.setData({ editFamilyFormOpen: false, editingFamilyId: '', editFamilyName: '' })
  },

  openJoinFamilyForm() {
    if (!this.data.account) {
      this.openLoginForm()
      return
    }
    this.setData({
      familySwitcherOpen: false,
      joinFamilyFormOpen: true,
      inviteCode: this.data.inviteCode || '',
    })
  },

  closeJoinFamilyForm() {
    this.setData({ joinFamilyFormOpen: false })
  },

  onFamilyInput(event) {
    const field = event.currentTarget.dataset.field
    this.setData({ [field]: event.detail.value })
  },

  async submitCreateFamily() {
    const name = String(this.data.familyName || '').trim()
    if (!name) {
      wx.showToast({ title: '家庭名称必填', icon: 'none' })
      return
    }
    const pendingGuestPlan = this.getStoredGuestPlan()
    this.setData({ loading: true })
    try {
      const session = await api.createFamily({ name }, this.data.session)
      this.applySession(session)
      await this.fetchPlan()
      const saved = await this.savePendingGuestPlanAfterFamilySetup(pendingGuestPlan)
      if (saved === false) wx.showToast({ title: '家庭已创建', icon: 'success' })
    } catch (err) {
      this.showError(err, '创建家庭失败')
    } finally {
      this.setData({ loading: false })
    }
  },

  async submitEditFamily() {
    const familyId = this.data.editingFamilyId
    const name = String(this.data.editFamilyName || '').trim()
    if (!familyId) {
      wx.showToast({ title: '请选择家庭', icon: 'none' })
      return
    }
    if (!name) {
      wx.showToast({ title: '家庭名称必填', icon: 'none' })
      return
    }
    this.setData({ loading: true })
    try {
      const session = await api.updateFamily(familyId, { name }, this.data.session)
      this.applySession(session, { editFamilyFormOpen: false, editingFamilyId: '', editFamilyName: '' })
      await this.fetchPlan()
      await this.loadFamilies()
      await this.loadFamilyManagementInfo()
      wx.showToast({ title: '家庭名称已更新', icon: 'success' })
    } catch (err) {
      this.showError(err, '修改家庭失败')
    } finally {
      this.setData({ loading: false })
    }
  },

  async submitJoinFamily() {
    const inviteCode = String(this.data.inviteCode || '').trim()
    if (!inviteCode) {
      wx.showToast({ title: '邀请码必填', icon: 'none' })
      return
    }
    const pendingGuestPlan = this.getStoredGuestPlan()
    this.setData({ loading: true })
    try {
      const session = await api.joinFamilyByInvite({ inviteCode }, this.data.session)
      this.applySession(session)
      await this.fetchPlan()
      const saved = await this.savePendingGuestPlanAfterFamilySetup(pendingGuestPlan)
      if (saved === false) wx.showToast({ title: session.role === 'child' ? '已绑定孩子微信' : '已加入家庭', icon: 'success' })
    } catch (err) {
      this.showError(err, '加入家庭失败')
    } finally {
      this.setData({ loading: false })
    }
  },

  async switchFamily(event) {
    const familyId = event.currentTarget.dataset.id
    if (!familyId) return
    const pendingGuestPlan = this.getStoredGuestPlan()
    this.setData({ loading: true })
    try {
      const session = await api.switchFamily(familyId, this.data.session)
      this.applySession(session)
      await this.fetchPlan()
      await this.loadFamilyManagementInfo()
      const saved = await this.savePendingGuestPlanAfterFamilySetup(pendingGuestPlan)
      if (saved === false) wx.showToast({ title: '已切换家庭', icon: 'success' })
    } catch (err) {
      this.showError(err, '切换家庭失败')
    } finally {
      this.setData({ loading: false })
    }
  },

  onFamilyRowTouchStart(event) {
    const touch = event.touches && event.touches[0]
    this.setData({ familyTouchStartX: touch ? touch.clientX : 0 })
  },

  onFamilyRowTouchEnd(event) {
    const familyId = event.currentTarget.dataset.id || ''
    const touch = event.changedTouches && event.changedTouches[0]
    const endX = touch ? touch.clientX : this.data.familyTouchStartX
    const deltaX = endX - this.data.familyTouchStartX
    this.setData({ swipedFamilyId: deltaX < -40 ? familyId : '' })
  },

  async deleteFamily(event) {
    const familyId = event.currentTarget.dataset.id || ''
    if (!familyId) return
    const confirmed = await new Promise((resolve) => {
      wx.showModal({
        title: '移出家庭',
        content: '只会把当前微信账号从这个家庭移出，不会删除孩子、课程、积分等家庭数据。',
        confirmText: '移出',
        confirmColor: '#e85d4f',
        cancelText: '取消',
        success: (res) => resolve(Boolean(res.confirm)),
        fail: () => resolve(false),
      })
    })
    if (!confirmed) {
      this.setData({ swipedFamilyId: '' })
      return
    }
    this.setData({ loading: true })
    try {
      const session = await api.deleteFamily(familyId, this.data.session)
      const remainingFamilies = (session.families || []).filter((item) => item.familyId !== familyId)
      const activeFamily = session.activeFamily && session.activeFamily.familyId !== familyId ? session.activeFamily : remainingFamilies[0] || null
      this.applySession(session, {
        swipedFamilyId: '',
        familySwitcherOpen: true,
        families: remainingFamilies,
        activeFamily,
        familyTitle: activeFamily ? activeFamily.name : '还没有家庭',
      })
      await this.fetchPlan()
      await this.loadFamilies()
      await this.loadFamilyManagementInfo()
      wx.showToast({ title: '已移出家庭', icon: 'success' })
    } catch (err) {
      this.showError(err, '移出家庭失败')
    } finally {
      this.setData({ loading: false })
    }
  },

  async createFamilyInvite() {
    if (!this.data.activeFamily) {
      wx.showToast({ title: '请先选择家庭', icon: 'none' })
      return
    }
    this.setData({ loading: true })
    try {
      const inviteInfo = decorateInviteInfo(await api.createInvite({
        role: this.data.inviteRole,
        relation: this.data.inviteRelation,
      }, this.data.session))
      this.setData({ inviteInfo })
      if (wx.setClipboardData) {
        wx.setClipboardData({ data: inviteInfo.inviteCode })
      }
    } catch (err) {
      this.showError(err, '生成邀请码失败')
    } finally {
      this.setData({ loading: false })
    }
  },

  async createChildBindInvite(event) {
    if (!this.data.activeFamily) {
      wx.showToast({ title: '请先选择家庭', icon: 'none' })
      return
    }
    const childKey = event.currentTarget.dataset.childKey
    if (!childKey) {
      wx.showToast({ title: '请选择孩子', icon: 'none' })
      return
    }
    this.setData({ loading: true })
    try {
      const inviteInfo = decorateInviteInfo(await api.createInvite({ role: 'child', childKey, maxUses: 1 }, this.data.session))
      this.setData({ inviteInfo })
      if (wx.setClipboardData) {
        wx.setClipboardData({ data: inviteInfo.inviteCode })
      }
    } catch (err) {
      this.showError(err, '生成绑定邀请失败')
    } finally {
      this.setData({ loading: false })
    }
  },

  async fetchPlan() {
    this.setData({ loading: true })
    try {
      let plan = null
      if (this.data.isGuest) {
        const { expired } = this.getOrCreateGuestSession()
        plan = this.getStoredGuestPlan() || emptyGuestPlan()
        this.storeGuestPlan(plan)
        if (expired) {
          wx.showToast({ title: '游客数据已过期，已重置', icon: 'none' })
        }
      } else {
        await this.ensureActiveFamilySession()
        plan = await api.loadPlan(this.data.session)
      }
      const children = (plan.children || []).map((child) => Object.assign({}, child, {
        avatarPath: getAvatarPath(child.avatar),
        patternPath: getPatternPath(child.avatar),
      }))
      let selectedChildId = this.data.selectedChildId || (children[0] && children[0].id) || ''
      if (this.data.session && this.data.session.role === 'child') {
        selectedChildId = this.data.session.childId || selectedChildId
      }
      this.refreshView({
        children,
        selectedChildId,
        courses: plan.courses || [],
        habits: plan.habits || [],
        tasks: plan.tasks || [],
        milestones: plan.milestones || [],
        completions: plan.completions || {},
        gifts: plan.gifts || [],
        redemptions: plan.redemptions || [],
        pointLedger: plan.pointLedger || [],
        rules: plan.rules || [],
      })
    } catch (err) {
      if (err.statusCode === 401) {
        this.logout()
      }
      this.showError(err, '数据加载失败')
    } finally {
      this.setData({ loading: false })
    }
  },

  refreshView(patch) {
    const state = Object.assign({}, this.data, patch)
    const selectedChild = state.children.find((child) => child.id === state.selectedChildId) || state.children[0] || null
    const selectedChildId = selectedChild ? selectedChild.id : ''
    const source = {
      courses: state.courses,
      habits: state.habits,
      tasks: state.tasks,
      milestones: state.milestones,
      completions: state.completions,
    }
    const baseRole = state.session && state.session.role ? state.session.role : 'guest'
    const guestPreviewRole = state.guestPreviewRole === 'child' ? 'child' : 'parent'
    const isGuest = baseRole === 'guest'
    const isGuestChildPreview = isGuest && guestPreviewRole === 'child'
    const isGuestParentPreview = isGuest && guestPreviewRole !== 'child'
    const parentChildPreviewChildId = baseRole === 'parent' ? (state.parentChildPreviewChildId || '') : ''
    const isParentChildPreview = baseRole === 'parent'
      && Boolean(parentChildPreviewChildId)
      && parentChildPreviewChildId === selectedChildId
    const role = isGuestChildPreview || isParentChildPreview ? 'child' : baseRole
    const tabs = getTabsForRole(role)
    let activeTab = state.activeTab
    if (activeTab !== 'notifications' && tabs.every((item) => item.key !== activeTab)) {
      activeTab = 'today'
    }
    const now = new Date()
    const canActAsParent = role === 'parent' || isGuestParentPreview
    const actionOptions = { now, isParent: canActAsParent, canUndoCompletion: canActAsParent }
    const todayAgenda = decorateAgendaActions(
      buildAgenda(state.today, source, selectedChildId),
      state.today,
      state.today,
      actionOptions
    )
    const selectedAgenda = decorateAgendaActions(
      buildAgenda(state.selectedDate, source, selectedChildId),
      state.selectedDate,
      state.today,
      actionOptions
    )
    const summaryAgenda = pickSummaryAgenda(activeTab, todayAgenda, selectedAgenda)
    const rate = completionRate(summaryAgenda)
    const visibleRules = (state.rules || [])
      .filter((rule) => !rule.childId || rule.childId === selectedChildId)
      .map((rule) => Object.assign({}, rule, {
        scope: rule.scope || (rule.childId ? 'child' : 'common'),
      }))
    const childRedemptions = (state.redemptions || []).filter((item) => item.childId === selectedChildId)
    const visiblePointLedger = (state.pointLedger || [])
      .filter((item) => item.childId === selectedChildId)
      .map((item) => decorateLedgerItem(item, state.children))
    const childPoints = selectedChild ? Number(selectedChild.points || 0) : 0
    const giftCards = (state.gifts || []).map((gift) => Object.assign({}, gift, {
      canRequest: Boolean(gift.active && gift.stock > 0 && childPoints >= Number(gift.pointsCost || 0)),
      statusText: gift.active ? '可兑换' : '已下架',
    }))
    const activeGiftCount = giftCards.filter((gift) => gift.active).length
    const pendingRedemptionCount = childRedemptions.filter((item) => item.status === 'pending').length
    const monthDate = toDate(state.selectedDate)
    const termInfo = getTermMonths(monthDate)
    const periodMode = state.calendarViewMode === 'year' ? 'year' : 'term'
    const readNotificationIds = state.readNotificationIds || {}
    const notifications = buildNotifications(role, todayAgenda, state.redemptions, selectedChildId, selectedChild)
      .filter((item) => !readNotificationIds[item.id])
    const historyTrend = buildHistoryTrend(state.today, source, selectedChildId)
    const historyAgenda = buildHistoryAgenda(state.today, source, selectedChildId)
    const historyCategoryStats = summarizeCategory(historyAgenda)
    const historySummary = summarizeHistoryTrend(historyTrend)
    const needsFamilySetup = baseRole === 'parent' && Boolean(state.account) && !state.activeFamily
    const canManagePlan = baseRole === 'parent' && !isParentChildPreview ? Boolean(state.activeFamily) : isGuestParentPreview
    const guestOnboardingVisible = isGuest && (state.children || []).length === 0
    const guestPreviewSwitchVisible = isGuest && (state.children || []).length > 0
    this.setData(Object.assign({}, patch, {
      tabs,
      activeTab,
      pageTitle: getPageTitle(role, activeTab),
      roleLabel: isParentChildPreview ? '孩子预览' : isGuest ? (isGuestChildPreview ? '孩子预览' : '家长预览') : getRoleLabel(role),
      isGuest,
      isParent: role === 'parent' || isGuestParentPreview,
      isChild: role === 'child',
      guestPreviewRole,
      guestPreviewSwitchVisible,
      isGuestParentPreview,
      isGuestChildPreview,
      parentChildPreviewChildId,
      parentChildPreviewActive: isParentChildPreview,
      canManagePlan,
      needsFamilySetup,
      guestOnboardingVisible,
      selectedChildId,
      selectedChild,
      selectedChildPoints: selectedChild ? Number(selectedChild.points || 0) : 0,
      activeGiftCount,
      pendingRedemptionCount,
      selectedDateLabel: shortDate(state.selectedDate),
      selectedMonthLabel: `${monthDate.getFullYear()}年${monthDate.getMonth() + 1}月`,
      todayAgenda,
      selectedAgenda,
      courseSummary: buildCourseSummary(state.courses, selectedChildId, state.completions),
      calendarDays: makeCalendarDays(state.selectedDate, source, selectedChildId),
      weekDays: makeWeekDays(state.selectedDate, source, selectedChildId),
      periodCards: makePeriodCards(state.selectedDate, source, selectedChildId, periodMode),
      periodTitle: state.calendarViewMode === 'year' ? `${monthDate.getFullYear()} 年计划` : termInfo.title,
      periodSubtitle: state.calendarViewMode === 'year' ? '1月-12月' : termInfo.subtitle,
      completionRate: rate,
      summaryCardVisible: shouldShowSummaryCard(activeTab),
      summaryRateLabel: summaryLabel(activeTab, shortDate(state.selectedDate)),
      rateRingStyle: getRateRingStyle(rate.percent),
      historyTrend,
      historySummary,
      categoryStats: historyCategoryStats,
      pointSummary: summarizePointLedger(visiblePointLedger),
      visiblePointLedger,
      visibleRules,
      giftCards,
      childRedemptions,
      notifications,
      notificationCount: notifications.length,
    }))
  },

  switchChild(event) {
    if (this.data.isChild) return
    const selectedChildId = event.currentTarget.dataset.id
    this.refreshView({ selectedChildId })
  },

  switchTab(event) {
    const activeTab = event.currentTarget.dataset.tab
    this.refreshView({ activeTab })
  },

  openLedgerDetail(event) {
    const id = event.currentTarget.dataset.id
    const item = this.data.visiblePointLedger.find((record) => record.id === id)
    if (!item) return
    this.setData({
      ledgerDetailOpen: true,
      ledgerDetail: buildLedgerDetail(item),
    })
  },

  closeLedgerDetail() {
    this.setData({
      ledgerDetailOpen: false,
      ledgerDetail: null,
    })
  },

  setCalendarView(event) {
    const calendarViewMode = event.currentTarget.dataset.mode || 'month'
    this.refreshView({ calendarViewMode })
  },

  openNotifications() {
    this.refreshView({
      notificationReturnTab: this.data.activeTab === 'notifications' ? this.data.notificationReturnTab : this.data.activeTab,
      activeTab: 'notifications',
    })
    this.loadWechatReminderConfig()
  },

  closeNotifications() {
    const activeTab = this.data.notificationReturnTab || 'today'
    this.refreshView({ activeTab })
  },

  selectNotification(event) {
    const notificationId = event.currentTarget.dataset.id
    const actionTab = event.currentTarget.dataset.tab || 'today'
    const role = this.data.isChild ? 'child' : 'parent'
    const tabs = getTabsForRole(role)
    const activeTab = tabs.some((item) => item.key === actionTab) ? actionTab : 'today'
    const readNotificationIds = Object.assign({}, this.data.readNotificationIds)
    if (notificationId) readNotificationIds[notificationId] = true
    this.refreshView({
      readNotificationIds,
      activeTab,
    })
  },

  async loadWechatReminderConfig() {
    if (this.data.isGuest || !this.data.session) return
    this.setData({ wechatReminderLoading: true })
    try {
      const result = await api.getReminderConfig(this.data.session)
      const templateIds = result.templateIds || {}
      const status = { daily: '未开启', deadline: '未开启' }
      ;(result.subscriptions || []).forEach((item) => {
        if (!item || !item.reminderType) return
        if (item.status === 'accept') status[item.reminderType] = '已开启'
        else if (item.status === 'reject') status[item.reminderType] = '已拒绝'
        else if (item.status === 'ban') status[item.reminderType] = '已关闭'
        else status[item.reminderType] = '未开启'
      })
      this.setData({
        wechatReminderTemplates: {
          daily: templateIds.daily || '',
          deadline: templateIds.deadline || '',
        },
        wechatReminderStatus: status,
      })
    } catch (err) {
      this.showError(err, '提醒配置加载失败')
    } finally {
      this.setData({ wechatReminderLoading: false })
    }
  },

  subscribeDailyReminder() {
    this.requestWechatReminder('daily')
  },

  subscribeDeadlineReminder() {
    this.requestWechatReminder('deadline')
  },

  requestWechatReminder(reminderType) {
    if (this.data.isGuest || !this.data.session) {
      wx.showToast({ title: '请先微信登录', icon: 'none' })
      return
    }
    const templateId = this.data.wechatReminderTemplates[reminderType]
    if (!templateId) {
      wx.showToast({ title: '先配置微信提醒模板', icon: 'none' })
      return
    }
    wx.requestSubscribeMessage({
      tmplIds: [templateId],
      success: async (res) => {
        const status = res[templateId] || 'reject'
        try {
          await api.saveReminderSubscription({
            reminderType,
            templateId,
            status,
          }, this.data.session)
          wx.showToast({ title: status === 'accept' ? '提醒已开启' : '未授权提醒', icon: 'none' })
          this.loadWechatReminderConfig()
        } catch (err) {
          this.showError(err, '保存提醒授权失败')
        }
      },
      fail: (err) => {
        this.showError(err, '微信提醒授权失败')
      },
    })
  },

  async sendReminderTest(event) {
    if (this.data.isGuest || !this.data.session) {
      wx.showToast({ title: '请先微信登录', icon: 'none' })
      return
    }
    const reminderType = event.currentTarget.dataset.type || 'daily'
    try {
      await api.sendReminderTest({ reminderType }, this.data.session)
      wx.showToast({ title: '测试提醒已发送', icon: 'none' })
    } catch (err) {
      this.showError(err, '测试提醒发送失败')
    }
  },

  changeSelectedDate(event) {
    this.refreshView({ selectedDate: event.detail.value })
  },

  moveSelectedDate(event) {
    const amount = Number(event.currentTarget.dataset.amount)
    this.refreshView({ selectedDate: addDays(this.data.selectedDate, amount) })
  },

  chooseCalendarDay(event) {
    this.refreshView({ selectedDate: event.currentTarget.dataset.date })
  },

  async toggleCompletion(event) {
    const itemId = event.currentTarget.dataset.id
    const item = this.data.todayAgenda.concat(this.data.selectedAgenda).find((entry) => entry.id === itemId)
    if (!item || item.category === 'milestone') return
    if (!item.canToggleCompletion) {
      wx.showToast({
        title: item.statusText === '未到时间' ? '还没到开始时间' : item.statusText === '待确认' ? '等待家长确认' : '这个项目不允许补卡',
        icon: 'none',
      })
      return
    }

    try {
      const completed = !item.completed
      const points = item.completed ? Number(item.completionPointsDelta || 0) : item.isMakeup ? item.makeupPoints : item.successPoints
      const confirmed = await new Promise((resolve) => {
        const title = item.completed ? '撤销完成' : item.isMakeup ? '补打卡确认' : item.pendingCompletion ? '确认完成' : '提交完成'
        const content = item.completed
          ? `撤销「${item.title}」完成记录？已计入的 ${points} 积分会扣回。`
          : item.isMakeup
            ? `补打卡「${item.title}」？确认后按补卡分计入 ${points} 积分。`
            : item.pendingCompletion
              ? `确认「${item.title}」已经完成？确认后计入 ${points} 积分。`
              : this.data.isChild
                ? `提交「${item.title}」完成申请？家长确认后计入积分。`
                : `确认「${item.title}」已经完成并计入 ${points} 积分？`
        wx.showModal({
          title,
          content,
          confirmText: item.completed ? '撤销' : item.isMakeup ? '补卡' : item.pendingCompletion ? '确认' : '提交',
          success: (res) => resolve(Boolean(res.confirm)),
          fail: () => resolve(false),
        })
      })
      if (!confirmed) return
      if (this.data.isGuest) {
        const nextPlan = applyGuestCompletionReward(this.currentGuestPlan(), {
          itemKey: item.id,
          childId: item.childId,
          title: item.title,
          completed,
          isMakeup: item.isMakeup,
          successPoints: item.successPoints,
          makeupPoints: item.makeupPoints,
          failurePoints: item.failurePoints,
        })
        wx.showToast({
          title: completed ? `体验完成 +${points}` : '已撤销完成',
          icon: 'none',
        })
        this.refreshGuestPlan(nextPlan)
        return
      }
      await api.updateCompletion(item.id, completed, this.data.session, { isMakeup: item.isMakeup })
      wx.showToast({
        title: item.completed ? '已撤销完成' : item.pendingCompletion ? `确认 +${points}` : this.data.isChild ? '已提交待确认' : `完成 +${points}`,
        icon: 'none',
      })
      await this.fetchPlan()
    } catch (err) {
      this.showError(err, '操作失败')
    }
  },

  openItemForm(event) {
    if (!this.data.isParent && !this.data.isGuest) return
    const kind = event.currentTarget.dataset.kind || 'tasks'
    if (!this.data.activeFamily) {
      if (!this.data.isGuest) {
        this.openFamilySwitcher()
        return
      }
    }
    const titleMap = {
      courses: '添加课程',
      habits: '添加习惯',
      tasks: '添加任务',
      milestones: '添加倒计时',
    }
    const labelMap = {
      courses: '加课程',
      habits: '加习惯',
      tasks: '任务',
      milestones: '加节点',
    }
    const draft = defaultItemDraft(this.data.selectedDate)
    const initialWeekday = WEEKDAY_VALUES[weekdayIndexFromDate(draft.startDate)]
    const itemWeekdays = [initialWeekday]
    const itemWeekdayTimes = { [initialWeekday]: draft.time }
    const itemWeekdayLessonTypes = { [initialWeekday]: 'formal' }
    if (kind === 'courses') {
      draft.successPoints = '4'
      draft.makeupPoints = '2'
      draft.successRule = '确认完成质量 + 4 积分'
      draft.makeupRule = '补卡完成 + 2 积分'
      draft.durationMinutes = '90'
      draft.weekdays = itemWeekdays
    }
    if (kind === 'habits') {
      draft.time = '18:30'
      draft.weekdays = itemWeekdays
      draft.makeupPoints = '1'
      draft.makeupRule = '补卡完成 + 1 积分'
    }
    if (kind === 'tasks') {
      draft.successPoints = '3'
      draft.makeupPoints = '1'
      draft.successRule = '按要求完成 + 3 积分'
      draft.makeupRule = '补卡完成 + 1 积分'
    }
    this.setData({
      itemFormOpen: true,
      itemFormKind: kind,
      itemFormTitle: titleMap[kind] || '添加任务',
      itemFormKindLabel: labelMap[kind] || '任务',
      editingItemId: '',
      itemDraft: draft,
      itemWeekdayIndex: weekdayIndexFromDate(draft.startDate),
      itemWeekdays,
      itemWeekdayTimes,
      itemWeekdayLessonTypes,
      itemWeekdaySchedules: makeWeekdaySchedules(itemWeekdays, itemWeekdayTimes, itemWeekdayLessonTypes, draft.time),
      itemExtraSessions: [],
      weekdayOptions: makeWeekdayOptions(itemWeekdays),
    })
  },

  openEditItem(event) {
    if (!this.data.canManagePlan) return
    const agendaId = event.currentTarget.dataset.id
    const agendaItem = this.data.todayAgenda.concat(this.data.selectedAgenda).find((entry) => entry.id === agendaId)
    if (!agendaItem || !agendaItem.sourceId) return

    const sourceMap = {
      course: { kind: 'courses', list: this.data.courses },
      habit: { kind: 'habits', list: this.data.habits },
      task: { kind: 'tasks', list: this.data.tasks },
      milestone: { kind: 'milestones', list: this.data.milestones },
    }
    const sourceConfig = sourceMap[agendaItem.category]
    if (!sourceConfig) return
    const source = sourceConfig.list.find((item) => item.id === agendaItem.sourceId)
    if (!source) return

    this.openSourceEditor(sourceConfig.kind, source)
  },

  openCalendarAgendaDetail(event) {
    if (!this.data.canManagePlan) return
    const agendaId = event.currentTarget.dataset.id
    const agendaItem = this.data.selectedAgenda.find((entry) => entry.id === agendaId)
    if (agendaItem && agendaItem.category === 'course') {
      this.openCourseSessionTypeEditor(event)
      return
    }
    this.openEditItem(event)
  },

  openCourseSessionTypeEditor(event) {
    if (!this.data.canManagePlan) return
    const agendaId = event.currentTarget.dataset.id
    const agendaItem = this.data.todayAgenda.concat(this.data.selectedAgenda).find((entry) => entry.id === agendaId)
    if (!agendaItem || agendaItem.category !== 'course' || !agendaItem.sourceId) return
    const course = this.data.courses.find((item) => item.id === agendaItem.sourceId)
    if (!course) return
    const lessonType = normalizeLessonType(agendaItem.lessonType)
    this.setData({
      courseSessionFormOpen: true,
      courseSessionDraft: {
        courseId: course.id,
        title: course.subject || '未命名课程',
        teacher: course.teacher || '未填写老师',
        date: agendaItem.date || this.data.selectedDate,
        time: agendaItem.time || course.time || '18:30',
        lessonType,
        lessonTypeLabel: lessonTypeLabel(lessonType),
        durationText: `${course.durationMinutes || 0} 分钟`,
        sourceText: agendaItem.sessionSource === 'extra' ? '单次调整' : '规律课',
        postponeDays: '7',
        postponeTargetText: shortDate(addDays(agendaItem.date || this.data.selectedDate, 7)),
      },
    })
  },

  closeCourseSessionForm() {
    this.setData({ courseSessionFormOpen: false, courseSessionDraft: null })
  },

  setCourseSessionLessonType(event) {
    const lessonType = normalizeLessonType(event.currentTarget.dataset.type)
    this.setData({
      'courseSessionDraft.lessonType': lessonType,
      'courseSessionDraft.lessonTypeLabel': lessonTypeLabel(lessonType),
    })
  },

  onCourseSessionPostponeDaysInput(event) {
    const value = event.detail.value
    const days = Math.max(1, Math.min(60, Number(value || 0) || 7))
    const date = this.data.courseSessionDraft && this.data.courseSessionDraft.date ? this.data.courseSessionDraft.date : this.data.selectedDate
    this.setData({
      'courseSessionDraft.postponeDays': value,
      'courseSessionDraft.postponeTargetText': shortDate(addDays(date, days)),
    })
  },

  async saveCourseSessionType() {
    const draft = this.data.courseSessionDraft
    if (!draft || !draft.courseId) return
    const course = this.data.courses.find((item) => item.id === draft.courseId)
    if (!course) return
    const extraSessions = upsertCourseExtraSession(course.extraSessions, {
      date: draft.date,
      time: draft.time,
      lessonType: draft.lessonType,
    })
    const payload = Object.assign({}, course, {
      childId: course.childId,
      weekdays: course.weekdays,
      schedules: getCourseSchedules(course).map((item) => ({
        weekday: item.weekday,
        time: item.time,
        lessonType: item.lessonType,
      })),
      extraSessions,
    })
    try {
      if (this.data.isGuest) {
        const courses = upsertGuestPlanItem(this.data.courses, payload)
        wx.showToast({ title: '已临时更新当日类型', icon: 'none' })
        this.setData({ courseSessionFormOpen: false, courseSessionDraft: null })
        this.refreshGuestPlan({ courses })
        return
      }
      await api.updatePlanItem('courses', course.id, payload, this.data.session)
      wx.showToast({ title: '已更新当日类型', icon: 'success' })
      this.setData({ courseSessionFormOpen: false, courseSessionDraft: null })
      await this.fetchPlan()
    } catch (err) {
      this.showError(err, '保存失败')
    }
  },

  async postponeCourseSessionFromDate() {
    const draft = this.data.courseSessionDraft
    if (!draft || !draft.courseId) return
    const course = this.data.courses.find((item) => item.id === draft.courseId)
    if (!course) return
    const days = Math.max(1, Math.min(60, Number(draft.postponeDays || 0) || 7))
    const confirmed = await new Promise((resolve) => {
      wx.showModal({
        title: '整体顺延课程',
        content: `从 ${shortDate(draft.date)} 开始，未完成课次整体顺延 ${days} 天，已完成课次不变。`,
        confirmText: '顺延',
        success: (res) => resolve(Boolean(res.confirm)),
        fail: () => resolve(false),
      })
    })
    if (!confirmed) return
    const postponedCourse = postponeCourseLessonsFromDate(course, draft.date, days)
    const payload = Object.assign({}, postponedCourse, {
      childId: course.childId,
      weekdays: course.weekdays,
      schedules: getCourseSchedules(course).map((item) => ({
        weekday: item.weekday,
        time: item.time,
        lessonType: item.lessonType,
      })),
      extraSessions: postponedCourse.extraSessions,
    })
    try {
      if (this.data.isGuest) {
        const courses = upsertGuestPlanItem(this.data.courses, payload)
        wx.showToast({ title: '已临时顺延课程', icon: 'none' })
        this.setData({ courseSessionFormOpen: false, courseSessionDraft: null })
        this.refreshGuestPlan({ courses })
        return
      }
      await api.updatePlanItem('courses', course.id, payload, this.data.session)
      wx.showToast({ title: '已整体顺延', icon: 'success' })
      this.setData({ courseSessionFormOpen: false, courseSessionDraft: null })
      await this.fetchPlan()
    } catch (err) {
      this.showError(err, '顺延失败')
    }
  },

  openCourseFromSummary(event) {
    if (!this.data.canManagePlan) return
    const id = event.currentTarget.dataset.id
    const source = this.data.courses.find((item) => item.id === id)
    if (!source) return
    this.openSourceEditor('courses', source)
  },

  openSourceEditor(kind, source) {
    const titleMap = {
      courses: '编辑课程',
      habits: '编辑习惯',
      tasks: '编辑任务',
      milestones: '编辑倒计时',
    }
    const labelMap = {
      courses: '加课程',
      habits: '加习惯',
      tasks: '任务',
      milestones: '加节点',
    }
    const draft = applyFocusRewardToDraft(defaultItemDraft(this.data.selectedDate), source)
    let itemWeekdayIndex = this.data.itemWeekdayIndex
    let itemWeekdays = []
    let itemWeekdayTimes = {}
    let itemWeekdayLessonTypes = {}
    let itemExtraSessions = []

    if (kind === 'courses') {
      draft.subject = source.subject || ''
      draft.teacher = source.teacher || ''
      draft.startDate = source.startDate || this.data.selectedDate
      draft.settlementDate = source.settlementDate || draft.startDate
      draft.time = source.time || '18:30'
      draft.durationMinutes = String(source.durationMinutes || 60)
      const sourceSchedules = getCourseSchedules(source)
      itemWeekdays = sourceSchedules.map((item) => Number(item.weekday))
      itemWeekdayTimes = sourceSchedules.reduce((result, item) => {
        result[Number(item.weekday)] = item.time || source.time || '18:30'
        return result
      }, {})
      itemWeekdayLessonTypes = sourceSchedules.reduce((result, item) => {
        result[Number(item.weekday)] = normalizeLessonType(item.lessonType)
        return result
      }, {})
      draft.weekdays = itemWeekdays
      draft.time = itemWeekdayTimes[itemWeekdays[0]] || source.time || '18:30'
      itemWeekdayIndex = Math.max(0, WEEKDAY_VALUES.indexOf(itemWeekdays[0]))
      itemExtraSessions = normalizeCourseExtraSessions(source.extraSessions)
    } else if (kind === 'habits') {
      draft.title = source.title || ''
      draft.time = source.time || '07:30'
      draft.frequency = source.frequency || 'daily'
      draft.weekdays = Array.isArray(source.weekdays) ? source.weekdays : []
      draft.startDate = source.startDate || this.data.selectedDate
      draft.endDate = source.endDate || draft.startDate
      itemWeekdays = draft.weekdays.length > 0 ? draft.weekdays : [WEEKDAY_VALUES[weekdayIndexFromDate(draft.startDate)]]
    } else if (kind === 'milestones') {
      draft.title = source.title || ''
      draft.date = source.date || this.data.selectedDate
    } else {
      draft.title = source.title || ''
      draft.dueDate = source.dueDate || this.data.selectedDate
      draft.time = source.time || '19:30'
    }

    this.setData({
      itemFormOpen: true,
      itemFormKind: kind,
      itemFormTitle: titleMap[kind] || '编辑任务',
      itemFormKindLabel: labelMap[kind] || '任务',
      editingItemId: source.id,
      itemDraft: draft,
      itemWeekdayIndex,
      itemWeekdays,
      itemWeekdayTimes,
      itemWeekdayLessonTypes,
      itemWeekdaySchedules: makeWeekdaySchedules(itemWeekdays, itemWeekdayTimes, itemWeekdayLessonTypes, draft.time),
      itemExtraSessions,
      weekdayOptions: makeWeekdayOptions(itemWeekdays),
    })
  },

  closeItemForm() {
    this.setData({ itemFormOpen: false, editingItemId: '', itemExtraSessions: [], itemWeekdayLessonTypes: {} })
  },

  onItemInput(event) {
    const field = event.currentTarget.dataset.field
    this.setData({ [`itemDraft.${field}`]: event.detail.value })
  },

  onItemSwitch(event) {
    const field = event.currentTarget.dataset.field
    this.setData({ [`itemDraft.${field}`]: event.detail.value })
  },

  onItemDateChange(event) {
    const field = event.currentTarget.dataset.field
    const patch = { [`itemDraft.${field}`]: event.detail.value }
    this.setData(patch)
  },

  onItemTimeChange(event) {
    this.setData({ 'itemDraft.time': event.detail.value })
  },

  onCourseScheduleTimeChange(event) {
    const weekday = Number(event.currentTarget.dataset.weekday)
    const value = event.detail.value
    const itemWeekdayTimes = Object.assign({}, this.data.itemWeekdayTimes, { [weekday]: value })
    this.setData({
      itemWeekdayTimes,
      itemWeekdaySchedules: makeWeekdaySchedules(this.data.itemWeekdays, itemWeekdayTimes, this.data.itemWeekdayLessonTypes, value),
      'itemDraft.time': itemWeekdayTimes[this.data.itemWeekdays[0]] || value,
    })
  },

  onCourseScheduleLessonTypeChange(event) {
    const weekday = Number(event.currentTarget.dataset.weekday)
    const lessonType = normalizeLessonType(event.currentTarget.dataset.type)
    const itemWeekdayLessonTypes = Object.assign({}, this.data.itemWeekdayLessonTypes, { [weekday]: lessonType })
    this.setData({
      itemWeekdayLessonTypes,
      itemWeekdaySchedules: makeWeekdaySchedules(this.data.itemWeekdays, this.data.itemWeekdayTimes, itemWeekdayLessonTypes, this.data.itemDraft.time || '18:30'),
    })
  },

  addCourseExtraSession() {
    const itemExtraSessions = this.data.itemExtraSessions.slice()
    itemExtraSessions.push({
      date: this.data.selectedDate || todayString(),
      time: this.data.itemDraft.time || '18:30',
      lessonType: 'formal',
    })
    this.setData({ itemExtraSessions: normalizeCourseExtraSessions(itemExtraSessions) })
  },

  removeCourseExtraSession(event) {
    const index = Number(event.currentTarget.dataset.index)
    const itemExtraSessions = this.data.itemExtraSessions.slice()
    itemExtraSessions.splice(index, 1)
    this.setData({ itemExtraSessions })
  },

  onCourseExtraDateChange(event) {
    const index = Number(event.currentTarget.dataset.index)
    const itemExtraSessions = this.data.itemExtraSessions.slice()
    if (!itemExtraSessions[index]) return
    itemExtraSessions[index] = Object.assign({}, itemExtraSessions[index], { date: event.detail.value })
    this.setData({ itemExtraSessions: normalizeCourseExtraSessions(itemExtraSessions) })
  },

  onCourseExtraTimeChange(event) {
    const index = Number(event.currentTarget.dataset.index)
    const itemExtraSessions = this.data.itemExtraSessions.slice()
    if (!itemExtraSessions[index]) return
    itemExtraSessions[index] = Object.assign({}, itemExtraSessions[index], { time: event.detail.value })
    this.setData({ itemExtraSessions: normalizeCourseExtraSessions(itemExtraSessions) })
  },

  onCourseExtraLessonTypeChange(event) {
    const index = Number(event.currentTarget.dataset.index)
    const lessonType = normalizeLessonType(event.currentTarget.dataset.type)
    const itemExtraSessions = this.data.itemExtraSessions.slice()
    if (!itemExtraSessions[index]) return
    itemExtraSessions[index] = Object.assign({}, itemExtraSessions[index], { lessonType })
    this.setData({ itemExtraSessions: normalizeCourseExtraSessions(itemExtraSessions) })
  },

  onItemWeekdayChange(event) {
    this.setData({ itemWeekdayIndex: Number(event.detail.value) })
  },

  toggleItemWeekday(event) {
    const value = Number(event.currentTarget.dataset.value)
    const selected = this.data.itemWeekdays.slice()
    const index = selected.indexOf(value)
    if (index >= 0) {
      selected.splice(index, 1)
    } else {
      selected.push(value)
    }
    const itemWeekdays = selected.length > 0 ? selected : [value]
    const itemWeekdayTimes = Object.assign({}, this.data.itemWeekdayTimes)
    const itemWeekdayLessonTypes = Object.assign({}, this.data.itemWeekdayLessonTypes)
    itemWeekdays.forEach((weekday) => {
      if (!itemWeekdayTimes[weekday]) itemWeekdayTimes[weekday] = this.data.itemDraft.time || '18:30'
      if (!itemWeekdayLessonTypes[weekday]) itemWeekdayLessonTypes[weekday] = 'formal'
    })
    this.setData({
      itemWeekdays,
      itemWeekdayTimes,
      itemWeekdayLessonTypes,
      itemWeekdaySchedules: makeWeekdaySchedules(itemWeekdays, itemWeekdayTimes, itemWeekdayLessonTypes, this.data.itemDraft.time || '18:30'),
      weekdayOptions: makeWeekdayOptions(itemWeekdays),
      itemWeekdayIndex: Math.max(0, WEEKDAY_VALUES.indexOf(itemWeekdays[0])),
      'itemDraft.weekdays': itemWeekdays,
    })
  },

  setHabitFrequency(event) {
    const frequency = event.currentTarget.dataset.frequency
    const patch = { 'itemDraft.frequency': frequency }
    if (frequency === 'daily') {
      patch.itemWeekdays = []
      patch.itemWeekdaySchedules = []
      patch.weekdayOptions = makeWeekdayOptions([])
      patch['itemDraft.weekdays'] = []
    } else if (this.data.itemWeekdays.length === 0) {
      const fallback = [WEEKDAY_VALUES[weekdayIndexFromDate(this.data.itemDraft.startDate || this.data.selectedDate)]]
      patch.itemWeekdays = fallback
      patch.itemWeekdayTimes = Object.assign({}, this.data.itemWeekdayTimes, { [fallback[0]]: this.data.itemDraft.time || '18:30' })
      patch.itemWeekdayLessonTypes = Object.assign({}, this.data.itemWeekdayLessonTypes, { [fallback[0]]: 'formal' })
      patch.itemWeekdaySchedules = makeWeekdaySchedules(fallback, patch.itemWeekdayTimes, patch.itemWeekdayLessonTypes, this.data.itemDraft.time || '18:30')
      patch.weekdayOptions = makeWeekdayOptions(fallback)
      patch['itemDraft.weekdays'] = fallback
    }
    this.setData(patch)
  },

  setFocusMode(event) {
    const mode = event.currentTarget.dataset.mode
    const patch = { 'itemDraft.focusMode': mode }
    if (mode === 'custom') patch['itemDraft.breakMinutes'] = '0'
    if (mode === 'pomodoro' && Number(this.data.itemDraft.breakMinutes || 0) <= 0) {
      patch['itemDraft.breakMinutes'] = '5'
    }
    this.setData(patch)
  },

  async saveItem() {
    const kind = this.data.itemFormKind
    const draft = this.data.itemDraft
    const editingItemId = this.data.editingItemId
    const childId = this.data.selectedChildId
    if (!childId) {
      wx.showToast({ title: '先选择孩子', icon: 'none' })
      return
    }

    const focusReward = {
      focusMode: draft.focusMode,
      focusMinutes: Number(draft.focusMinutes || 25),
      breakMinutes: draft.focusMode === 'custom' ? 0 : Number(draft.breakMinutes || 0),
      successPoints: Number(draft.successPoints || 0),
      failurePoints: Number(draft.failurePoints || 0),
      allowMakeup: draft.allowMakeup !== false,
      makeupPoints: Number(draft.makeupPoints || 0),
      successRule: draft.successRule,
      makeupRule: draft.makeupRule,
      failureRule: draft.failureRule,
    }
    let payload = {}
    if (kind === 'courses') {
      if (!draft.subject || !draft.teacher) {
        wx.showToast({ title: '课程和老师必填', icon: 'none' })
        return
      }
      const selectedWeekday = WEEKDAY_VALUES[this.data.itemWeekdayIndex]
      const schedules = (this.data.itemWeekdays.length > 0 ? this.data.itemWeekdays : [selectedWeekday])
        .map((weekday) => ({
          weekday,
          time: this.data.itemWeekdayTimes[weekday] || draft.time,
          lessonType: normalizeLessonType(this.data.itemWeekdayLessonTypes[weekday]),
        }))
      payload = Object.assign({
        childId,
        subject: draft.subject,
        teacher: draft.teacher,
        startDate: draft.startDate,
        settlementDate: draft.settlementDate,
        weekday: selectedWeekday === undefined ? toDate(draft.startDate).getDay() : selectedWeekday,
        weekdays: schedules.map((item) => item.weekday),
        schedules,
        extraSessions: normalizeCourseExtraSessions(this.data.itemExtraSessions),
        time: schedules[0] ? schedules[0].time : draft.time,
        durationMinutes: Number(draft.durationMinutes || 60),
      }, focusReward)
    } else if (kind === 'habits') {
      if (!draft.title) {
        wx.showToast({ title: '习惯名称必填', icon: 'none' })
        return
      }
      payload = Object.assign({
        childId,
        title: draft.title,
        frequency: draft.frequency || 'daily',
        weekdays: draft.frequency === 'daily' ? [] : this.data.itemWeekdays,
        startDate: draft.startDate,
        endDate: draft.endDate,
        time: draft.time,
        meta: draft.frequency === 'range' ? `${draft.startDate} 至 ${draft.endDate}` : draft.frequency === 'weekly' ? '周期习惯' : '每日习惯',
      }, focusReward)
    } else if (kind === 'milestones') {
      if (!draft.title) {
        wx.showToast({ title: '节点名称必填', icon: 'none' })
        return
      }
      payload = {
        title: draft.title,
        date: draft.date,
      }
    } else {
      if (!draft.title) {
        wx.showToast({ title: '任务名称必填', icon: 'none' })
        return
      }
      payload = Object.assign({
        childId,
        title: draft.title,
        dueDate: draft.dueDate,
        time: draft.time,
        meta: '任务',
      }, focusReward)
    }

    try {
      if (this.data.isGuest) {
        const id = editingItemId || `guest-${kind}-${Date.now()}`
        const nextItem = Object.assign({ id }, payload)
        const listKey = {
          courses: 'courses',
          habits: 'habits',
          tasks: 'tasks',
          milestones: 'milestones',
        }[kind]
        const list = kind === 'tasks'
          ? addGuestTask(this.data.tasks, nextItem)
          : upsertGuestPlanItem(this.data[listKey], nextItem)
        wx.showToast({ title: editingItemId ? '已保存临时数据' : '已新增临时数据', icon: 'none' })
        this.setData({ itemFormOpen: false, editingItemId: '', itemExtraSessions: [] })
        this.refreshGuestPlan({ [listKey]: list })
        return
      }
      if (editingItemId) {
        await api.updatePlanItem(kind, editingItemId, payload, this.data.session)
      } else {
        await api.createPlanItem(kind, payload, this.data.session)
      }
      wx.showToast({ title: editingItemId ? '已保存' : '已新增', icon: 'success' })
      this.setData({ itemFormOpen: false, editingItemId: '', itemExtraSessions: [] })
      await this.fetchPlan()
    } catch (err) {
      this.showError(err, '保存失败')
    }
  },

  deleteEditingItem() {
    if ((!this.data.isParent && !this.data.isGuest) || !this.data.editingItemId) return
    const kind = this.data.itemFormKind
    const labelMap = {
      courses: '课程',
      habits: '习惯',
      tasks: '任务',
      milestones: '倒计时',
    }
    wx.showModal({
      title: `删除${labelMap[kind] || '任务'}`,
      content: '删除后会从日历和今日安排里移除，已完成记录也会一起清理。',
      confirmText: '删除',
      confirmColor: '#c35d12',
      success: async (res) => {
        if (!res.confirm) return
        try {
          if (this.data.isGuest) {
            const listKey = {
              courses: 'courses',
              habits: 'habits',
              tasks: 'tasks',
              milestones: 'milestones',
            }[kind]
            const list = deleteGuestPlanItem(this.data[listKey], this.data.editingItemId)
            wx.showToast({ title: '已删除临时数据', icon: 'none' })
            this.setData({ itemFormOpen: false, editingItemId: '' })
            this.refreshGuestPlan({ [listKey]: list })
            return
          }
          await api.deletePlanItem(kind, this.data.editingItemId, this.data.session)
          wx.showToast({ title: '已删除', icon: 'success' })
          this.setData({ itemFormOpen: false, editingItemId: '' })
          await this.fetchPlan()
        } catch (err) {
          this.showError(err, '删除失败')
        }
      },
    })
  },

  openGiftForm(event) {
    if (!this.data.isParent && !this.data.isGuest) return
    if (!this.data.activeFamily) {
      if (!this.data.isGuest) {
        this.openFamilySwitcher()
        return
      }
    }
    const id = event.currentTarget.dataset.id
    const gift = this.data.gifts.find((item) => item.id === id)
    this.setData({
      giftFormOpen: true,
      editingGiftId: id || '',
      giftDraft: gift ? {
        title: gift.title,
        description: gift.description || '',
        imageUrl: gift.imageUrl,
        pointsCost: String(gift.pointsCost),
        stock: String(gift.stock),
        active: gift.active,
      } : defaultGiftDraft(),
    })
  },

  closeGiftForm() {
    this.setData({ giftFormOpen: false })
  },

  onGiftInput(event) {
    const currentDataset = event.currentTarget && event.currentTarget.dataset ? event.currentTarget.dataset : {}
    const targetDataset = event.target && event.target.dataset ? event.target.dataset : {}
    const field = currentDataset.field || targetDataset.field
    if (!field) return
    this.setData({ [`giftDraft.${field}`]: event.detail.value })
  },

  onGiftActiveChange(event) {
    this.setData({ 'giftDraft.active': event.detail.value })
  },

  chooseGiftImage() {
    const handlePath = (filePath, size) => {
      if (!filePath) return
      this.compressAndSetGiftImage(filePath, size)
    }

    if (wx.chooseMedia) {
      wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        success: (result) => {
          const file = result.tempFiles && result.tempFiles[0]
          if (file && file.tempFilePath) handlePath(file.tempFilePath, file.size)
        },
        fail: () => {},
      })
      return
    }

    wx.chooseImage({
      count: 1,
      sourceType: ['album', 'camera'],
      success: (result) => {
        if (result.tempFilePaths && result.tempFilePaths[0]) handlePath(result.tempFilePaths[0])
      },
    })
  },

  async compressAndSetGiftImage(filePath, knownSize) {
    this.setData({ imageCompressing: true })
    wx.showLoading({ title: '压缩照片...' })
    try {
      const imageUrl = await this.prepareGiftImageDataUrl(filePath, knownSize)
      wx.hideLoading()
      this.setData({ 'giftDraft.imageUrl': imageUrl })
      wx.showToast({ title: '照片已压缩', icon: 'success' })
    } catch (err) {
      wx.hideLoading()
      wx.showToast({ title: err.message || '图片压缩失败', icon: 'none' })
    } finally {
      this.setData({ imageCompressing: false })
    }
  },

  async prepareGiftImageDataUrl(filePath, knownSize) {
    const originalSize = knownSize || await this.getGiftImageFileSize(filePath)
    if (originalSize > 0 && originalSize <= MAX_GIFT_IMAGE_BYTES) {
      return this.readGiftImage(filePath)
    }

    const nativeCompressed = await this.tryNativeGiftImageCompression(filePath)
    if (nativeCompressed) return nativeCompressed

    const imageInfo = await this.getGiftImageInfo(filePath, originalSize)
    const attempts = makeGiftImageCompressionPlan(imageInfo)
    for (let index = 0; index < attempts.length; index += 1) {
      const attempt = attempts[index]
      const tempFilePath = await this.drawGiftImageToCanvas(filePath, attempt)
      const size = await this.getGiftImageFileSize(tempFilePath)
      if (size > 0 && size <= MAX_GIFT_IMAGE_BYTES) {
        return this.readGiftImage(tempFilePath, JPEG_DATA_URL_PREFIX)
      }
    }

    throw new Error('压缩后仍超过 200K，请换一张图')
  },

  async tryNativeGiftImageCompression(filePath) {
    if (!wx.compressImage) return ''
    const qualities = [70, 55, 40, 30]
    for (let index = 0; index < qualities.length; index += 1) {
      try {
        const tempFilePath = await this.compressGiftImage(filePath, qualities[index])
        const size = await this.getGiftImageFileSize(tempFilePath)
        if (size > 0 && size <= MAX_GIFT_IMAGE_BYTES) {
          return this.readGiftImage(tempFilePath)
        }
      } catch (err) {
        // Continue with the canvas fallback.
      }
    }
    return ''
  },

  compressGiftImage(filePath, quality) {
    return new Promise((resolve, reject) => {
      wx.compressImage({
        src: filePath,
        quality,
        success: (result) => resolve(result.tempFilePath || filePath),
        fail: reject,
      })
    })
  },

  getGiftImageFileSize(filePath) {
    return new Promise((resolve) => {
      if (!wx.getFileInfo) {
        resolve(0)
        return
      }
      wx.getFileInfo({
        filePath,
        success: (result) => resolve(Number(result.size || 0)),
        fail: () => resolve(0),
      })
    })
  },

  getGiftImageInfo(filePath, size) {
    return new Promise((resolve, reject) => {
      wx.getImageInfo({
        src: filePath,
        success: (result) => resolve({
          width: result.width,
          height: result.height,
          size: size || 0,
        }),
        fail: reject,
      })
    })
  },

  waitGiftCanvasReady(width, height) {
    return new Promise((resolve) => {
      this.setData({ giftCanvasWidth: width, giftCanvasHeight: height })
      if (wx.nextTick) {
        wx.nextTick(resolve)
        return
      }
      setTimeout(resolve, 30)
    })
  },

  async drawGiftImageToCanvas(filePath, attempt) {
    await this.waitGiftCanvasReady(attempt.width, attempt.height)
    return new Promise((resolve, reject) => {
      const ctx = wx.createCanvasContext('giftImageCanvas', this)
      ctx.drawImage(filePath, 0, 0, attempt.width, attempt.height)
      ctx.draw(false, () => {
        wx.canvasToTempFilePath({
          canvasId: 'giftImageCanvas',
          fileType: 'jpg',
          quality: attempt.quality,
          destWidth: attempt.width,
          destHeight: attempt.height,
          success: (result) => resolve(result.tempFilePath),
          fail: reject,
        }, this)
      })
    })
  },

  readGiftImage(filePath, dataUrlPrefix) {
    const fs = wx.getFileSystemManager()
    return new Promise((resolve, reject) => {
      fs.readFile({
        filePath,
        encoding: 'base64',
        success: (result) => {
          const lower = filePath.toLowerCase()
          const prefix = dataUrlPrefix || (lower.indexOf('.png') >= 0 ? 'data:image/png;base64,' : JPEG_DATA_URL_PREFIX)
          const imageUrl = `${prefix}${result.data}`
          if (!isGiftImageDataUrlWithinLimit(imageUrl)) {
            reject(new Error('礼品照片不能超过 200K'))
            return
          }
          resolve(imageUrl)
        },
        fail: () => reject(new Error('读取图片失败')),
      })
    })
  },

  async saveGift() {
    const draft = this.data.giftDraft
    const validationMessage = validateGiftDraft(draft)
    if (validationMessage) {
      wx.showToast({ title: validationMessage, icon: 'none' })
      return
    }
    const payload = buildGiftPayload(draft)
    try {
      if (this.data.isGuest) {
        const id = this.data.editingGiftId || `guest-gift-${Date.now()}`
        const gifts = upsertGuestPlanItem(this.data.gifts, Object.assign({ id }, payload))
        wx.showToast({ title: '礼品已临时保存', icon: 'none' })
        this.setData({ giftFormOpen: false, editingGiftId: '' })
        this.refreshGuestPlan({ gifts })
        return
      }
      if (this.data.editingGiftId) {
        await api.updateGift(this.data.editingGiftId, payload, this.data.session)
      } else {
        await api.createGift(payload, this.data.session)
      }
      wx.showToast({ title: '礼品已保存', icon: 'success' })
      this.setData({ giftFormOpen: false })
      await this.fetchPlan()
    } catch (err) {
      this.showError(err, '礼品保存失败')
    }
  },

  deleteEditingGift() {
    if ((!this.data.isParent && !this.data.isGuest) || !this.data.editingGiftId) return
    wx.showModal({
      title: '删除礼品',
      content: '删除后礼品中心不再显示，历史兑换记录会保留。',
      confirmText: '删除',
      confirmColor: '#c35d12',
      success: async (res) => {
        if (!res.confirm) return
        try {
          if (this.data.isGuest) {
            const gifts = deleteGuestPlanItem(this.data.gifts, this.data.editingGiftId)
            wx.showToast({ title: '已删除临时礼品', icon: 'none' })
            this.setData({ giftFormOpen: false, editingGiftId: '' })
            this.refreshGuestPlan({ gifts })
            return
          }
          await api.deleteGift(this.data.editingGiftId, this.data.session)
          wx.showToast({ title: '礼品已删除', icon: 'success' })
          this.setData({ giftFormOpen: false, editingGiftId: '' })
          await this.fetchPlan()
        } catch (err) {
          this.showError(err, '删除失败')
        }
      },
    })
  },

  requestGift(event) {
    const giftId = event.currentTarget.dataset.id
    const gift = this.data.gifts.find((item) => item.id === giftId)
    if (!gift) return
    if (!this.data.selectedChild || Number(this.data.selectedChild.points || 0) < Number(gift.pointsCost || 0)) {
      wx.showToast({ title: '积分不够', icon: 'none' })
      return
    }

    wx.showModal({
      title: '申请兑换',
      content: `确认用 ${gift.pointsCost} 积分兑换「${gift.title}」？`,
      success: async (res) => {
        if (!res.confirm) return
        try {
          if (this.data.isGuest) {
            const redemption = {
              id: `guest-redemption-${Date.now()}`,
              childId: this.data.selectedChildId,
              giftId,
              giftTitle: gift.title,
              pointsCost: gift.pointsCost,
              status: 'pending',
              note: '游客临时申请，保存到家庭后才会持久',
              createdAt: new Date().toISOString(),
            }
            wx.showToast({ title: '已提交临时申请', icon: 'none' })
            this.refreshGuestPlan({ redemptions: (this.data.redemptions || []).concat(redemption) })
            return
          }
          await api.createRedemption({ giftId, childId: this.data.selectedChildId }, this.data.session)
          wx.showToast({ title: '已提交', icon: 'success' })
          await this.fetchPlan()
        } catch (err) {
          this.showError(err, '兑换失败')
        }
      },
    })
  },

  async decideRedemption(event) {
    if (!this.data.isParent && !this.data.isGuest) return
    if (!this.data.activeFamily && !this.data.isGuest) return
    const id = event.currentTarget.dataset.id
    const status = event.currentTarget.dataset.status
    try {
      if (this.data.isGuest) {
        const redemptions = (this.data.redemptions || []).map((item) => item.id === id
          ? Object.assign({}, item, {
            status,
            note: status === 'approved' ? '游客临时通过' : '游客临时退回',
            decidedAt: new Date().toISOString(),
          })
          : item)
        wx.showToast({ title: status === 'approved' ? '已通过' : '已退回', icon: 'none' })
        this.refreshGuestPlan({ redemptions })
        return
      }
      await api.updateRedemptionStatus(id, status, this.data.session)
      wx.showToast({ title: status === 'approved' ? '已通过' : '已退回', icon: 'success' })
      await this.fetchPlan()
    } catch (err) {
      this.showError(err, '处理失败')
    }
  },

  openRuleForm(event) {
    if (!this.data.isParent && !this.data.isGuest) return
    if (!this.data.activeFamily) {
      if (!this.data.isGuest) {
        this.openFamilySwitcher()
        return
      }
    }
    const id = event.currentTarget.dataset.id
    const rule = this.data.rules.find((item) => item.id === id)
    this.setData({
      ruleFormOpen: true,
      editingRuleId: id || '',
      ruleScope: rule && rule.childId ? 'child' : 'common',
      ruleDraft: rule ? {
        title: rule.title,
        body: rule.body,
        childId: rule.childId || '',
      } : defaultRuleDraft(),
    })
  },

  closeRuleForm() {
    this.setData({ ruleFormOpen: false })
  },

  setRuleScope(event) {
    const scope = event.currentTarget.dataset.scope
    this.setData({
      ruleScope: scope,
      'ruleDraft.childId': scope === 'child' ? this.data.selectedChildId : '',
    })
  },

  onRuleInput(event) {
    const field = event.currentTarget.dataset.field
    this.setData({ [`ruleDraft.${field}`]: event.detail.value })
  },

  async saveRule() {
    const draft = this.data.ruleDraft
    if (!draft.title || !draft.body) {
      wx.showToast({ title: '规则标题和内容必填', icon: 'none' })
      return
    }
    const payload = {
      title: draft.title,
      body: draft.body,
      childId: this.data.ruleScope === 'child' ? this.data.selectedChildId : '',
    }
    try {
      if (this.data.isGuest) {
        const id = this.data.editingRuleId || `guest-rule-${Date.now()}`
        const rules = upsertGuestPlanItem(this.data.rules, Object.assign({ id }, payload))
        wx.showToast({ title: '规则已临时保存', icon: 'none' })
        this.setData({ ruleFormOpen: false, editingRuleId: '' })
        this.refreshGuestPlan({ rules })
        return
      }
      if (this.data.editingRuleId) {
        await api.updateRule(this.data.editingRuleId, payload, this.data.session)
      } else {
        await api.createRule(payload, this.data.session)
      }
      wx.showToast({ title: '规则已保存', icon: 'success' })
      this.setData({ ruleFormOpen: false })
      await this.fetchPlan()
    } catch (err) {
      this.showError(err, '规则保存失败')
    }
  },

  deleteEditingRule() {
    if ((!this.data.isParent && !this.data.isGuest) || !this.data.editingRuleId) return
    wx.showModal({
      title: '删除规则',
      content: '删除后家长端和孩子端都不会再显示这条规则。',
      confirmText: '删除',
      confirmColor: '#c35d12',
      success: async (res) => {
        if (!res.confirm) return
        try {
          if (this.data.isGuest) {
            const rules = deleteGuestPlanItem(this.data.rules, this.data.editingRuleId)
            wx.showToast({ title: '已删除临时规则', icon: 'none' })
            this.setData({ ruleFormOpen: false, editingRuleId: '' })
            this.refreshGuestPlan({ rules })
            return
          }
          await api.deleteRule(this.data.editingRuleId, this.data.session)
          wx.showToast({ title: '已删除', icon: 'success' })
          this.setData({ ruleFormOpen: false, editingRuleId: '' })
          await this.fetchPlan()
        } catch (err) {
          this.showError(err, '删除失败')
        }
      },
    })
  },

  openProfileEdit() {
    if (!this.data.selectedChild) return
    const gradeIndex = Math.max(0, GRADES.indexOf(this.data.selectedChild.grade))
    this.setData({
      profileEditing: true,
      profileDraft: {
        name: this.data.selectedChild.name,
        grade: this.data.selectedChild.grade,
      },
      profileGradeIndex: gradeIndex,
    })
  },

  closeProfileEdit() {
    this.setData({ profileEditing: false })
  },

  onProfileInput(event) {
    const field = event.currentTarget.dataset.field
    this.setData({ [`profileDraft.${field}`]: event.detail.value })
  },

  onProfileGradeChange(event) {
    const index = Number(event.detail.value)
    this.setData({
      profileGradeIndex: index,
      'profileDraft.grade': GRADES[index],
    })
  },

  selectProfileGrade(event) {
    const grade = event.currentTarget.dataset.grade
    const index = Math.max(0, GRADES.indexOf(grade))
    this.setData({
      profileGradeIndex: index,
      'profileDraft.grade': grade,
    })
  },

  async saveProfile() {
    const child = this.data.selectedChild
    if (!child) return
    try {
      await api.updateChildProfile(child.id, {
        name: this.data.profileDraft.name,
        grade: this.data.profileDraft.grade || child.grade,
        avatar: child.avatar,
      }, this.data.session)
      wx.showToast({ title: '资料已保存', icon: 'success' })
      this.setData({ profileEditing: false })
      await this.fetchPlan()
    } catch (err) {
      this.showError(err, '资料保存失败')
    }
  },

  onDefaultTimerInput(event) {
    const field = event.currentTarget.dataset.field
    const value = event.detail.value
    const patch = { [field]: value }
    if (field === 'defaultFocusMinutes') {
      const minutes = Math.max(1, Number(value || 25))
      patch.defaultFocusDisplay = this.formatTimer(minutes * 60)
    }
    this.setData(patch)
  },

  openTimer(event) {
    const itemId = event.currentTarget.dataset.id
    const item = this.data.todayAgenda.concat(this.data.selectedAgenda).find((entry) => entry.id === itemId)
    const minutes = item ? Number(item.focusMinutes || 25) : Number(this.data.defaultFocusMinutes || 25)
    const breakMinutes = item ? Number(item.breakMinutes || 0) : Number(this.data.defaultBreakMinutes || 0)
    const seconds = Math.max(1, minutes) * 60
    this.clearTimer()
    this.setData({
      timerOpen: true,
      timerItemTitle: item ? item.title : '专注时间',
      timerBreakMinutes: Math.max(0, breakMinutes),
      timerSeconds: seconds,
      timerTotalSeconds: seconds,
      timerDisplay: this.formatTimer(seconds),
      timerStatus: 'ready',
      timerStatusLabel: '准备开始',
      timerHint: '准备开始',
      timerProgressDeg: 360,
    })
  },

  closeTimer() {
    this.clearTimer()
    this.setData({ timerOpen: false })
  },

  startTimer() {
    if (this.data.timerStatus === 'running') return
    this.setData({ timerStatus: 'running', timerStatusLabel: '专注中', timerHint: '专注中' })
    this.timerId = setInterval(() => {
      const seconds = Math.max(0, this.data.timerSeconds - 1)
      this.setData({
        timerSeconds: seconds,
        timerDisplay: this.formatTimer(seconds),
        timerProgressDeg: getTimerProgressDeg(seconds, this.data.timerTotalSeconds),
      })
      if (seconds <= 0) {
        this.finishTimer()
      }
    }, 1000)
  },

  resetTimer() {
    this.clearTimer()
    const seconds = this.data.timerTotalSeconds
    this.setData({
      timerSeconds: seconds,
      timerDisplay: this.formatTimer(seconds),
      timerStatus: 'ready',
      timerStatusLabel: '准备开始',
      timerHint: '准备开始',
      timerProgressDeg: 360,
    })
  },

  finishTimer() {
    this.clearTimer()
    this.setData({
      timerStatus: 'finished',
      timerStatusLabel: '已完成',
      timerHint: `已完成，可以休息 ${this.data.timerBreakMinutes} 分钟`,
      timerDisplay: '完成',
      timerProgressDeg: 0,
    })
    this.playAlarm()
  },

  clearTimer() {
    if (this.timerId) {
      clearInterval(this.timerId)
      this.timerId = null
    }
  },

  formatTimer(seconds) {
    return `${pad(Math.floor(seconds / 60))}:${pad(seconds % 60)}`
  },

  playAlarm() {
    if (wx.vibrateLong) {
      wx.vibrateLong()
    }
    if (!wx.createInnerAudioContext) return
    const audio = wx.createInnerAudioContext()
    audio.src = '/assets/family/focus-alarm.mp3'
    audio.volume = 1
    audio.play()
    setTimeout(() => {
      audio.destroy()
    }, 9000)
  },

  showError(err, fallback) {
    const message = err && err.response && err.response.message ? err.response.message : fallback
    wx.showToast({ title: message, icon: 'none' })
  },
})
