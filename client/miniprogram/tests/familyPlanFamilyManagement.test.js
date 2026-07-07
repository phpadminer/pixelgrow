const assert = require('assert')
const fs = require('fs')
const path = require('path')

const pageJs = fs.readFileSync(path.join(__dirname, '../pages/family-plan/index.js'), 'utf8')
const wxml = fs.readFileSync(path.join(__dirname, '../pages/family-plan/index.wxml'), 'utf8')
const wxss = fs.readFileSync(path.join(__dirname, '../pages/family-plan/index.wxss'), 'utf8')
const apiJs = fs.readFileSync(path.join(__dirname, '../utils/familyPlanApi.js'), 'utf8')
const controllerTs = fs.readFileSync(path.join(__dirname, '../../../server/src/modules/family-plan/family-plan.controller.ts'), 'utf8')
const serviceTs = fs.readFileSync(path.join(__dirname, '../../../server/src/modules/family-plan/family-plan.service.ts'), 'utf8')
const schema = fs.readFileSync(path.join(__dirname, '../../../server/prisma/schema.prisma'), 'utf8')

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
  schema.includes('childKey           String?')
    && schema.includes('boundAccountId String?')
    && schema.includes('@@unique([boundAccountId])'),
  'schema should persist child-specific invites and WeChat child bindings'
)

assert(
  /async createInvite\(dto: CreateFamilyPlanInviteDto[\s\S]*?dto\.role === 'child'[\s\S]*?childKey: inviteChild\?\.childKey/.test(serviceTs)
    && /private async joinChildInvite\([\s\S]*?boundAccountId: session\.accountId[\s\S]*?toChildAuthResult/.test(serviceTs),
  'server should create child binding invites and persist the bound WeChat account'
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
  wxml.includes('bindtap="createChildBindInvite"')
    && wxml.includes('绑定微信')
    && wxml.includes('邀请家长')
    && wxml.includes('wx:if="{{item.canBindWechat}}"')
    && !wxml.includes('邀请管理员'),
  'family management should expose parent invite and child WeChat binding without admin invite UI'
)

assert(
  /canBindWechat: !isBound/.test(pageJs)
    && !wxml.includes("!== 'bound'"),
  'child bind visibility should be precomputed in JS instead of using strict comparison in WXML'
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
  /async createChildBindInvite\(event\)[\s\S]*?api\.createInvite\(\{ role: 'child', childKey, maxUses: 1 \}/.test(pageJs)
    && /function decorateInviteInfo\(inviteInfo\)[\s\S]*?孩子绑定码[\s\S]*?家长邀请码/.test(pageJs),
  'client should generate child binding invites and decorate invite copy by role'
)

assert(
  wxss.includes('.family-manage-card')
    && wxss.includes('.family-member-row')
    && wxss.includes('.family-child-row')
    && wxss.includes('.family-form-sheet')
    && wxss.includes('.family-child-bind-button'),
  'family management UI should have warm styled member rows'
)

console.log('familyPlanFamilyManagement tests passed')
