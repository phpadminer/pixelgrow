const assert = require('assert')
const fs = require('fs')
const path = require('path')

const wxml = fs.readFileSync(path.join(__dirname, '../pages/family-plan/index.wxml'), 'utf8')
const pageJs = fs.readFileSync(path.join(__dirname, '../pages/family-plan/index.js'), 'utf8')
const wxss = fs.readFileSync(path.join(__dirname, '../pages/family-plan/index.wxss'), 'utf8')

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
  /\.list-tag[\s\S]*?flex: 0 0 142rpx[\s\S]*?white-space: nowrap/.test(wxss)
    && /\.list-tag\.milestone[\s\S]*?font-size: 24rpx/.test(wxss),
  'calendar milestone countdown labels should fit on one line'
)

const guestCardIndex = wxml.indexOf('class="guest-expiry-card"')
const todayTabIndex = wxml.indexOf('class="tab-content" wx:if="{{activeTab === \'today\'}}"')
assert(
  guestCardIndex >= 0 && todayTabIndex >= 0 && guestCardIndex < todayTabIndex,
  'guest expiry card should sit at the top of the page, not inside the today tab'
)

assert(
  wxml.includes('bindtap="dismissGuestExpiryCard"') && wxml.includes('guestNoticeDismissed'),
  'guest expiry card should be dismissible'
)

assert(
  wxml.includes('>登录保存</button>') && !wxml.includes('>保存到家庭</button>'),
  'guest save button text should be short enough to avoid wrapping'
)

assert(
  /\.guest-expiry-card\s*\{[^}]*flex-direction: column/.test(wxss)
    && /\.guest-expiry-actions\s*\{[^}]*display: grid[^}]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/.test(wxss)
    && /\.guest-save-button\s*\{[^}]*min-width: 0/.test(wxss)
    && /\.guest-clear-button\s*\{[^}]*min-width: 0/.test(wxss),
  'guest expiry card actions should be compact bottom buttons without overlapping the close button'
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
  wxml.includes('bindtap="deleteEditingGift"') && wxml.includes('删除礼品'),
  'gift editor should expose gift deletion when editing an existing gift'
)

assert(
  wxml.includes('wx:if="{{canManagePlan}}" class="primary-button compact" bindtap="openRuleForm"'),
  'guest temporary family should expose rule management'
)

assert(
  wxml.includes("{{item.scope === 'child' ? '独立规则' : '共同规则'}}"),
  'rules without an explicit scope should default to common, not independent'
)

assert(
  /const visibleRules = \(state\.rules \|\| \[\]\)[\s\S]*?scope: rule\.scope \|\| \(rule\.childId \? 'child' : 'common'\)/.test(pageJs),
  'visible rules should normalize missing scope from childId'
)

console.log('familyPlanWxml tests passed')
