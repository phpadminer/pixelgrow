const assert = require('assert')
const {
  formatCourseScheduleLabel,
  getCourseSessionForDate,
  summarizeCourseLessons,
  normalizeCourseExtraSessions,
  upsertCourseExtraSession,
} = require('../utils/familyPlanCourseSchedule')

const weekdayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

const course = {
  id: 'course-a',
  weekday: 1,
  time: '18:30',
  startDate: '2026-07-01',
  settlementDate: '2026-08-01',
  schedules: [
    { weekday: 1, time: '18:30', lessonType: 'trial' },
    { weekday: 3, time: '19:30', lessonType: 'bonus' },
  ],
  extraSessions: [
    { date: '2026-08-22', time: '09:00', lessonType: 'formal' },
    { sessionDate: '2026-08-24', time: '10:00', lessonType: 'bonus' },
    { date: '2026-08-26' },
  ],
}

assert.deepStrictEqual(normalizeCourseExtraSessions(course.extraSessions), [
  { date: '2026-08-22', time: '09:00', lessonType: 'formal', lessonTypeLabel: '正式' },
  { date: '2026-08-24', time: '10:00', lessonType: 'bonus', lessonTypeLabel: '赠送' },
  { date: '2026-08-26', time: '18:30', lessonType: 'formal', lessonTypeLabel: '正式' },
])

assert.deepStrictEqual(getCourseSessionForDate(course, '2026-07-06'), {
  date: '2026-07-06',
  time: '18:30',
  lessonType: 'trial',
  lessonTypeLabel: '试听',
  source: 'recurring',
})

assert.deepStrictEqual(getCourseSessionForDate(course, '2026-08-22'), {
  date: '2026-08-22',
  time: '09:00',
  lessonType: 'formal',
  lessonTypeLabel: '正式',
  source: 'extra',
})

assert.strictEqual(getCourseSessionForDate(course, '2026-08-23'), null)

const label = formatCourseScheduleLabel(
  course,
  (weekday) => weekdayNames[Number(weekday)] || '',
  (date) => `${Number(date.slice(5, 7))}月${Number(date.slice(8, 10))}日`
)

assert(label.includes('周一 18:30 试听'))
assert(label.includes('周三 19:30 赠送'))
assert(label.includes('单次 8月22日 09:00 正式、8月24日 10:00 赠送、8月26日 18:30 正式'))

const summary = summarizeCourseLessons(course, {
  'course-course-a-2026-07-06': { completed: true },
  'course-course-a-2026-07-08': { status: 'pending' },
  'course-course-a-2026-08-22': { completed: true },
})

assert.deepStrictEqual(summary, {
  total: 12,
  trial: 4,
  formal: 2,
  bonus: 6,
  completed: 2,
  pending: 10,
})

const courseWithOneTrialInRecurringDates = {
  id: 'course-b',
  weekday: 1,
  time: '18:30',
  startDate: '2026-07-01',
  settlementDate: '2026-07-31',
  schedules: [
    { weekday: 1, time: '18:30' },
  ],
  extraSessions: [
    { date: '2026-07-06', time: '18:30', lessonType: 'trial' },
  ],
}

assert.deepStrictEqual(getCourseSessionForDate(courseWithOneTrialInRecurringDates, '2026-07-06'), {
  date: '2026-07-06',
  time: '18:30',
  lessonType: 'trial',
  lessonTypeLabel: '试听',
  source: 'extra',
})

assert.deepStrictEqual(summarizeCourseLessons(courseWithOneTrialInRecurringDates), {
  total: 4,
  trial: 1,
  formal: 3,
  bonus: 0,
  completed: 0,
  pending: 4,
})

assert.deepStrictEqual(upsertCourseExtraSession(
  [
    { date: '2026-07-06', time: '18:30', lessonType: 'trial' },
    { date: '2026-07-13', time: '18:30', lessonType: 'formal' },
  ],
  { date: '2026-07-06', time: '18:30', lessonType: 'bonus' }
), [
  { date: '2026-07-06', time: '18:30', lessonType: 'bonus', lessonTypeLabel: '赠送' },
  { date: '2026-07-13', time: '18:30', lessonType: 'formal', lessonTypeLabel: '正式' },
])

console.log('familyPlanCourseSchedule tests passed')
