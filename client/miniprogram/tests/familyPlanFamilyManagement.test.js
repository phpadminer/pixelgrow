const assert = require('assert')
const fs = require('fs')
const path = require('path')

const pageJs = fs.readFileSync(path.join(__dirname, '../pages/family-plan/index.js'), 'utf8')
const wxml = fs.readFileSync(path.join(__dirname, '../pages/family-plan/index.wxml'), 'utf8')
const wxss = fs.readFileSync(path.join(__dirname, '../pages/family-plan/index.wxss'), 'utf8')
const apiJs = fs.readFileSync(path.join(__dirname, '../utils/familyPlanApi.js'), 'utf8')
const controllerTs = fs.readFileSync(path.join(__dirname, '../../../server/src/modules/family-plan/family-plan.controller.ts'), 'utf8')
const serviceTs = fs.readFileSync(path.join(__dirname, '../../../server/src/modules/family-plan/family-plan.service.ts'), 'utf8')

assert(
  /function getCurrentFamilyMembers\(session\)[\s\S]*?\/family-plan\/families\/current\/members/.test(apiJs),
  'client api should expose current family member details'
)

assert(
  /@Get\('families\/current\/members'\)[\s\S]*?getCurrentFamilyMembers/.test(controllerTs),
  'server should expose current family member details endpoint'
)

assert(
  /async getCurrentFamilyMembers\(authorization\?: string\)[\s\S]*?requireActiveFamilySession[\s\S]*?familyPlanFamilyMember\.findMany[\s\S]*?familyPlanChild\.findMany/.test(serviceTs),
  'server member endpoint should return active members and children for the current family'
)

assert(
  wxml.includes('家庭管理')
    && wxml.includes('家庭 ID')
    && wxml.includes('已绑定微信家人')
    && wxml.includes('孩子账号')
    && wxml.includes('open-type="share"'),
  'family sheet should be upgraded into a family management surface with sharing'
)

assert(
  wxml.includes('class="sheet family-form-sheet"')
    && wxml.includes('邀请码已包含身份，加入后直接进入对应家庭。'),
  'join and create family forms should use compact sheets and explain invite role handling'
)

assert(
  /async loadFamilyManagementInfo\(\)[\s\S]*?api\.getCurrentFamilyMembers/.test(pageJs)
    && /async openFamilySwitcher\(\)[\s\S]*?await this\.loadFamilies\(\)[\s\S]*?await this\.loadFamilyManagementInfo\(\)/.test(pageJs),
  'family management sheet should load member details when opened'
)

assert(
  /onShareAppMessage\(\)[\s\S]*?inviteInfo\.inviteCode[\s\S]*?inviteCode=/.test(pageJs),
  'WeChat share payload should include the generated invite code'
)

assert(
  wxss.includes('.family-manage-card')
    && wxss.includes('.family-member-row')
    && wxss.includes('.family-child-row')
    && wxss.includes('.family-form-sheet'),
  'family management UI should have warm styled member rows'
)

console.log('familyPlanFamilyManagement tests passed')
