const assert = require('assert')
const fs = require('fs')
const path = require('path')

const wxml = fs.readFileSync(path.join(__dirname, '../pages/family-plan/index.wxml'), 'utf8')

assert(
  !wxml.includes('wx:for="{{lessonTypeOptions}}"'),
  'lesson type chips should be static in WXML to avoid nested loop expression blank screen'
)

assert(
  wxml.includes('单次课类型调整'),
  'course editor should expose single-session lesson type adjustment'
)

assert(
  !wxml.includes('零散课次'),
  'course editor should not hide single-session type changes under scattered-session wording'
)

assert(
  !wxml.includes('catchtap="openCourseSessionTypeEditor"'),
  'calendar should not show a separate detail button for course rows'
)

assert(
  !wxml.includes('list-detail-button'),
  'calendar course row detail button class should be removed'
)

assert(
  wxml.includes('当日课次类型'),
  'daily course-session type editor should be present'
)

assert(
  wxml.includes('wx:for="{{selectedAgenda}}" wx:key="id" class="list-row" data-id="{{item.id}}" bindtap="openCalendarAgendaDetail"'),
  'calendar agenda rows should open daily agenda detail, not full course editor'
)

assert(
  !wxml.includes('<view class="eyebrow">课程详情</view>'),
  'daily course-session detail should not be labeled as full course detail'
)

console.log('familyPlanWxml tests passed')
