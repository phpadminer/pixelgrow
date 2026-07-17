function pad(value) {
  return String(value).padStart(2, '0')
}

function toLocalDate(value) {
  return new Date(`${value}T00:00:00`)
}

function addDays(dateValue, days) {
  const date = toLocalDate(dateValue)
  date.setDate(date.getDate() + Number(days || 0))
  return makeDateString(date)
}

function defaultShortDate(dateValue) {
  if (!dateValue || dateValue.length < 10) return dateValue || ''
  return `${Number(dateValue.slice(5, 7))}月${Number(dateValue.slice(8, 10))}日`
}

const LESSON_TYPE_OPTIONS = [
  { value: 'trial', label: '试听' },
  { value: 'formal', label: '正式' },
  { value: 'bonus', label: '赠送' },
]

const LESSON_TYPE_LABELS = LESSON_TYPE_OPTIONS.reduce((result, item) => {
  result[item.value] = item.label
  return result
}, {})

function normalizeLessonType(value) {
  return LESSON_TYPE_LABELS[value] ? value : 'formal'
}

function lessonTypeLabel(value) {
  return LESSON_TYPE_LABELS[normalizeLessonType(value)]
}

function normalizeCourseExtraSessions(extraSessions = []) {
  if (!Array.isArray(extraSessions)) return []
  return extraSessions
    .map((item) => {
      const next = {
        date: item.date || item.sessionDate || '',
        time: item.time || '18:30',
        lessonType: normalizeLessonType(item.lessonType),
        lessonTypeLabel: lessonTypeLabel(item.lessonType),
      }
      if (item.status === 'skipped' || item.status === 'postponed') next.status = item.status
      if (item.sourceDate) next.sourceDate = item.sourceDate
      return next
    })
    .filter((item) => item.date)
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
}

function upsertCourseExtraSession(extraSessions = [], session = {}) {
  const date = session.date || session.sessionDate || ''
  if (!date) return normalizeCourseExtraSessions(extraSessions)
  const nextSession = {
    date,
    time: session.time || '18:30',
    lessonType: normalizeLessonType(session.lessonType),
  }
  const rest = Array.isArray(extraSessions)
    ? extraSessions.filter((item) => (item.date || item.sessionDate || '') !== date)
    : []
  return normalizeCourseExtraSessions(rest.concat(nextSession))
}

function getCourseSchedules(course = {}) {
  const schedules = Array.isArray(course.schedules) && course.schedules.length > 0
    ? course.schedules
    : [{ weekday: Number(course.weekday), time: course.time }]
  return schedules
    .filter((item) => item.weekday !== undefined && item.weekday !== null && !Number.isNaN(Number(item.weekday)))
    .map((item) => ({
      weekday: Number(item.weekday),
      time: item.time || course.time || '18:30',
      lessonType: normalizeLessonType(item.lessonType),
      lessonTypeLabel: lessonTypeLabel(item.lessonType),
    }))
}

function findCourseExtraSession(course, date) {
  const sessions = normalizeCourseExtraSessions(course && course.extraSessions).filter((item) => item.date === date)
  return sessions.find((item) => item.status !== 'skipped') || sessions[0] || null
}

function hasSkippedCourseSession(course, date) {
  return normalizeCourseExtraSessions(course && course.extraSessions).some((item) => item.date === date && item.status === 'skipped')
}

function isInsideRange(date, startDate, endDate) {
  if (!startDate || !endDate) return false
  return date >= startDate && date <= endDate
}

function getCourseSessionForDate(course = {}, date) {
  const extraSession = findCourseExtraSession(course, date)
  if (extraSession) {
    if (extraSession.status === 'skipped') return null
    const session = {
      date,
      time: extraSession.time || course.time || '18:30',
      lessonType: extraSession.lessonType,
      lessonTypeLabel: extraSession.lessonTypeLabel,
      source: 'extra',
    }
    if (extraSession.sourceDate) session.sourceDate = extraSession.sourceDate
    if (extraSession.status) session.status = extraSession.status
    return session
  }

  if (hasSkippedCourseSession(course, date)) return null
  if (!isInsideRange(date, course.startDate, course.settlementDate)) return null
  const weekday = toLocalDate(date).getDay()
  const schedule = getCourseSchedules(course).find((item) => Number(item.weekday) === weekday)
  if (!schedule) return null
  return {
    date,
    time: schedule.time || course.time || '18:30',
    lessonType: schedule.lessonType,
    lessonTypeLabel: schedule.lessonTypeLabel,
    source: 'recurring',
  }
}

function formatCourseScheduleLabel(course = {}, weekdayLabel, shortDate) {
  const labelWeekday = weekdayLabel || ((weekday) => `周${weekday}`)
  const labelDate = shortDate || defaultShortDate
  const recurringLabels = getCourseSchedules(course)
    .map((item) => `${labelWeekday(item.weekday)} ${item.time || course.time || '18:30'} ${item.lessonTypeLabel}`)
  const extraLabels = normalizeCourseExtraSessions(course.extraSessions)
    .map((item) => `${labelDate(item.date)} ${item.time} ${item.lessonTypeLabel}`)
  if (extraLabels.length > 0) {
    recurringLabels.push(`单次 ${extraLabels.join('、')}`)
  }
  return recurringLabels.join('、')
}

function makeDateString(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function completionKey(course, date) {
  return `course-${course.id || course.sourceId || ''}-${date}`
}

function isCompleted(record) {
  return Boolean(record && (record.completed === true || record.status === 'completed'))
}

function listCourseLessons(course = {}) {
  const lessons = []
  const extraSessions = normalizeCourseExtraSessions(course.extraSessions)
  const extraSessionDates = extraSessions.reduce((result, item) => {
    if (item.status !== 'skipped') result[item.date] = true
    return result
  }, {})
  const skippedSessionDates = extraSessions.reduce((result, item) => {
    if (item.status === 'skipped') result[item.date] = true
    return result
  }, {})
  if (course.startDate && course.settlementDate) {
    const cursor = toLocalDate(course.startDate)
    const end = toLocalDate(course.settlementDate)
    const schedules = getCourseSchedules(course)
    while (cursor <= end) {
      const date = makeDateString(cursor)
      const weekday = cursor.getDay()
      if (!extraSessionDates[date] && !skippedSessionDates[date]) {
        schedules
          .filter((item) => Number(item.weekday) === weekday)
          .forEach((schedule) => {
            lessons.push({
              date,
              time: schedule.time || course.time || '18:30',
              lessonType: schedule.lessonType,
              lessonTypeLabel: schedule.lessonTypeLabel,
              source: 'recurring',
            })
          })
      }
      cursor.setDate(cursor.getDate() + 1)
    }
  }
  extraSessions.forEach((item) => {
    if (item.status === 'skipped') return
    const lesson = {
      date: item.date,
      time: item.time || course.time || '18:30',
      lessonType: item.lessonType,
      lessonTypeLabel: item.lessonTypeLabel,
      source: 'extra',
    }
    if (item.sourceDate) lesson.sourceDate = item.sourceDate
    if (item.status) lesson.status = item.status
    lessons.push(lesson)
  })
  return lessons.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
}

function postponeCourseLessonsFromDate(course = {}, fromDate, days = 7) {
  const delayDays = Math.max(1, Number(days || 0))
  const lessons = listCourseLessons(course)
    .filter((lesson) => lesson.date >= fromDate && !isCompleted((course.completions || {})[completionKey(course, lesson.date)]))
  if (lessons.length === 0) return Object.assign({}, course, { extraSessions: normalizeCourseExtraSessions(course.extraSessions) })

  const generated = []
  lessons.forEach((lesson) => {
    generated.push({
      date: lesson.date,
      time: lesson.time || course.time || '18:30',
      lessonType: lesson.lessonType,
      status: 'skipped',
    })
    generated.push({
      date: addDays(lesson.date, delayDays),
      time: lesson.time || course.time || '18:30',
      lessonType: lesson.lessonType,
      sourceDate: lesson.date,
      status: 'postponed',
    })
  })
  const affectedDates = generated.reduce((result, item) => {
    result[item.date] = true
    return result
  }, {})
  const existing = Array.isArray(course.extraSessions)
    ? course.extraSessions.filter((item) => !affectedDates[item.date || item.sessionDate || ''])
    : []
  return Object.assign({}, course, {
    extraSessions: normalizeCourseExtraSessions(existing.concat(generated)),
  })
}

function summarizeCourseLessons(course = {}, completions = {}) {
  const summary = {
    total: 0,
    trial: 0,
    formal: 0,
    bonus: 0,
    completed: 0,
    pending: 0,
  }
  listCourseLessons(course).forEach((lesson) => {
    const lessonType = normalizeLessonType(lesson.lessonType)
    summary.total += 1
    summary[lessonType] += 1
    if (isCompleted(completions[completionKey(course, lesson.date)])) {
      summary.completed += 1
    }
  })
  summary.pending = Math.max(0, summary.total - summary.completed)
  return summary
}

module.exports = {
  LESSON_TYPE_OPTIONS,
  findCourseExtraSession,
  formatCourseScheduleLabel,
  getCourseSchedules,
  getCourseSessionForDate,
  lessonTypeLabel,
  listCourseLessons,
  makeDateString,
  normalizeLessonType,
  normalizeCourseExtraSessions,
  postponeCourseLessonsFromDate,
  summarizeCourseLessons,
  upsertCourseExtraSession,
}
