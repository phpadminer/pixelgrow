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

assert(
  wxml.includes('data-field="title" value="{{giftDraft.title}}" bindinput="onGiftInput" bindblur="onGiftInput"'),
  'gift title input should sync on input and blur before validation'
)

assert(
  !wxml.includes('<block wx:if="{{!isLoggedIn}}">'),
  'first screen should not require login before users can browse the service'
)

assert(
  wxml.includes('wx:if="{{loginFormOpen}}" class="modal-mask"'),
  'login form should be opened only after an explicit user action'
)

assert(
  wxml.includes('bindtap="openLoginForm"'),
  'guest users should have an explicit login entry after browsing'
)

assert(
  wxml.includes('wx:if="{{canManagePlan}}"') && wxml.includes('data-kind="tasks" bindtap="openItemForm">▣ 加任务'),
  'guest temporary family should use the full task creation entry'
)

assert(
  wxml.includes('guestExpiryText') && wxml.includes('3 天后自动清空'),
  'guest users should see temporary account expiry and deletion warning'
)

assert(
  wxml.includes('wx:if="{{canManagePlan}}"') && wxml.includes('data-kind="courses" bindtap="openItemForm">＋ 加课程'),
  'guest temporary family should expose the same plan creation entry points'
)

assert(
  wxml.includes('wx:if="{{canManagePlan}}" class="primary-button compact" bindtap="openGiftForm"'),
  'guest temporary family should expose gift management'
)

assert(
  wxml.includes('wx:if="{{canManagePlan}}" class="primary-button compact" bindtap="openRuleForm"'),
  'guest temporary family should expose rule management'
)

console.log('familyPlanWxml tests passed')
