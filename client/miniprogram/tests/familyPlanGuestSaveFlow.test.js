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
