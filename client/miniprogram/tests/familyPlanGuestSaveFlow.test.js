const assert = require('assert')
const fs = require('fs')
const path = require('path')

const pageJs = fs.readFileSync(path.join(__dirname, '../pages/family-plan/index.js'), 'utf8')
const wxml = fs.readFileSync(path.join(__dirname, '../pages/family-plan/index.wxml'), 'utf8')

assert(
  pageJs.includes('pendingGuestSavePlan: null'),
  'page state should keep a pending guest plan while the user creates or joins a family'
)

assert(
  /async loginWithWechat\(\)[\s\S]*?hasGuestPlanData\(pendingGuestPlan\)[\s\S]*?pendingGuestSavePlan: pendingGuestPlan/.test(pageJs),
  'WeChat login should remember guest data when the account has no active family yet'
)

assert(
  /clearGuestLocalData\(\)[\s\S]*?wx\.removeStorageSync\(GUEST_PLAN_KEY\)[\s\S]*?wx\.removeStorageSync\(GUEST_SESSION_KEY\)[\s\S]*?pendingGuestSavePlan: null/.test(pageJs)
    && wxml.includes('bindtap="clearGuestLocalData"')
    && wxml.includes('清空体验'),
  'guest users should be able to explicitly clear local temporary data'
)

assert(
  /chooseGuestPlanAction\(\)[\s\S]*?wx\.showActionSheet\(\{[\s\S]*?保存到当前家庭[\s\S]*?不保存，清空本地数据[\s\S]*?稍后处理/.test(pageJs)
    && /async maybeOfferGuestPlanSave\(pendingGuestPlan\)[\s\S]*?const action = await this\.chooseGuestPlanAction\(\)[\s\S]*?if \(action === 'clear'\) \{[\s\S]*?this\.clearGuestLocalData\(\)/.test(pageJs),
  'login with an active family should ask whether to save, clear, or keep guest data for later'
)

assert(
  /async confirmPendingGuestPlanWithoutFamily\(guestPlan\)[\s\S]*?检测到游客数据[\s\S]*?保留待保存[\s\S]*?清空/.test(pageJs)
    && /async loginWithWechat\(\)[\s\S]*?await this\.confirmPendingGuestPlanWithoutFamily\(pendingGuestPlan\)/.test(pageJs),
  'login without an active family should ask whether to keep guest data for later saving or clear it'
)

assert(
  /async savePendingGuestPlanAfterFamilySetup\(fallbackPlan\)[\s\S]*?saveGuestPlanToFamily\(guestPlan\)/.test(pageJs),
  'family setup should save remembered guest data after a family exists'
)

assert(
  /async submitCreateFamily\(\)[\s\S]*?savePendingGuestPlanAfterFamilySetup\(pendingGuestPlan\)/.test(pageJs),
  'creating a family should continue the pending guest save flow'
)

assert(
  /async submitJoinFamily\(\)[\s\S]*?savePendingGuestPlanAfterFamilySetup\(pendingGuestPlan\)/.test(pageJs),
  'joining a family should continue the pending guest save flow'
)

assert(
  /function isDefaultGuestChild\(child\)[\s\S]*?child\.id\.startsWith\('guest-child-'\)[\s\S]*?child\.name === '我的孩子'/.test(pageJs)
    && /if \(isDefaultGuestChild\(child\) && firstFamilyChildId\) \{[\s\S]*?childIdMap\[child\.id\] = selectedFamilyChildId \|\| firstFamilyChildId[\s\S]*?continue/.test(pageJs),
  'saving guest data into an existing family should map the default temporary child to an existing child instead of creating a duplicate'
)

assert(
  wxml.includes('创建或加入家庭后，会自动保存游客数据'),
  'family setup state should tell users that guest data will be saved after family setup'
)

console.log('familyPlanGuestSaveFlow tests passed')
