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
  /function updateFamily\(familyId, payload, session\)[\s\S]*?request\.put\(`\/family-plan\/families\/\$\{encodeURIComponent\(familyId\)\}`/.test(apiJs)
    && /function deleteFamily\(familyId, session\)[\s\S]*?request\.del\(`\/family-plan\/families\/\$\{encodeURIComponent\(familyId\)\}`/.test(apiJs),
  'client api should expose family rename and remove operations'
)

assert(
  /function updateCurrentFamilyMember\(payload, session\)[\s\S]*?request\.put\('\/family-plan\/families\/current\/members\/me'/.test(apiJs),
  'client api should expose current family member relation updates'
)

assert(
  /function updateFamilyMember\(memberId, payload, session\)[\s\S]*?request\.put\(`\/family-plan\/families\/current\/members\/\$\{encodeURIComponent\(memberId\)\}`/.test(apiJs),
  'client api should expose creator-managed member relation updates'
)

assert(
  /function updateFamilyMemberRole\(memberId, payload, session\)[\s\S]*?request\.put\(`\/family-plan\/families\/current\/members\/\$\{encodeURIComponent\(memberId\)\}\/role`/.test(apiJs),
  'client api should expose creator-managed member role updates'
)

assert(
  /@Get\('families\/current\/members'\)[\s\S]*?getCurrentFamilyMembers/.test(controllerTs),
  'server should expose current family member details endpoint'
)

assert(
  /@Put\('families\/current\/members\/me'\)[\s\S]*?updateCurrentFamilyMember/.test(controllerTs),
  'server should expose current family member relation update endpoint'
)

assert(
  /@Put\('families\/current\/members\/:memberId'\)[\s\S]*?updateFamilyMember/.test(controllerTs),
  'server should expose owner-managed member relation update endpoint'
)

assert(
  /@Put\('families\/current\/members\/:memberId\/role'\)[\s\S]*?updateFamilyMemberRole/.test(controllerTs)
    && /export class UpdateFamilyPlanMemberRoleDto[\s\S]*?@IsIn\(\['admin', 'parent', 'viewer'\]\)[\s\S]*?role: 'admin' \| 'parent' \| 'viewer'/.test(fs.readFileSync(path.join(__dirname, '../../../server/src/modules/family-plan/family-plan.dto.ts'), 'utf8')),
  'server should expose owner-only member permission role update endpoint'
)

assert(
  /@Put\('families\/:id'\)[\s\S]*?updateFamily/.test(controllerTs)
    && /@Delete\('families\/:id'\)[\s\S]*?deleteFamily/.test(controllerTs)
    && /export class UpdateFamilyPlanFamilyDto[\s\S]*?name: string/.test(fs.readFileSync(path.join(__dirname, '../../../server/src/modules/family-plan/family-plan.dto.ts'), 'utf8')),
  'server should expose family rename and remove endpoints'
)

assert(
  /async getCurrentFamilyMembers\(authorization\?: string\)[\s\S]*?requireActiveFamilySession[\s\S]*?familyPlanFamilyMember\.findMany[\s\S]*?familyPlanChild\.findMany/.test(serviceTs),
  'server member endpoint should return active members and children for the current family'
)

assert(
  /async updateFamily\(id: string, dto: UpdateFamilyPlanFamilyDto[\s\S]*?normalizeFamilyName\(dto\.name\)[\s\S]*?toParentAuthResult/.test(serviceTs)
    && /async deleteFamily\(id: string[\s\S]*?status: 'inactive'[\s\S]*?buildWechatParentSession/.test(serviceTs),
  'server should rename a joined family and remove the current account membership without deleting plan data'
)

assert(
  schema.includes('childKey           String?')
    && schema.includes('boundAccountId String?')
    && schema.includes('@@unique([boundAccountId])'),
  'schema should persist child-specific invites and WeChat child bindings'
)

assert(
  /model FamilyPlanFamilyMember[\s\S]*?relation\s+String\?/.test(schema)
    && /model FamilyPlanInvite[\s\S]*?relation\s+String\?/.test(schema),
  'schema should persist family relation labels on members and invites'
)

assert(
  /export class UpdateFamilyPlanMemberDto[\s\S]*?relation\?: string/.test(fs.readFileSync(path.join(__dirname, '../../../server/src/modules/family-plan/family-plan.dto.ts'), 'utf8'))
    && /export class CreateFamilyPlanInviteDto[\s\S]*?relation\?: string/.test(fs.readFileSync(path.join(__dirname, '../../../server/src/modules/family-plan/family-plan.dto.ts'), 'utf8')),
  'DTOs should accept family relation labels'
)

assert(
  /async updateCurrentFamilyMember\(dto: UpdateFamilyPlanMemberDto,[\s\S]*?relation = normalizeFamilyRelation\(dto\.relation\)/.test(serviceTs)
    && serviceTs.includes("relation: inviteRole === 'child' ? null : normalizeFamilyRelation(dto.relation)")
    && serviceTs.includes('relation: inviteRelation')
    && /private async joinChildInvite\([\s\S]*?boundAccountId: session\.accountId[\s\S]*?toChildAuthResult/.test(serviceTs),
  'server should update member relation and carry invite relation onto joined members'
)

assert(
  /async updateFamilyMember\(memberId: string, dto: UpdateFamilyPlanMemberDto,[\s\S]*?operator\.role !== 'owner'[\s\S]*?只有创建者可以管理成员身份[\s\S]*?relation = normalizeFamilyRelation\(dto\.relation\)[\s\S]*?relation,[\s\S]*?\n\s+\}\)[\s\S]*?return this\.getCurrentFamilyMembers\(authorization\)/.test(serviceTs),
  'server should only allow the creator to change other member family relation labels'
)

assert(
  /async updateFamilyMemberRole\(memberId: string, dto: UpdateFamilyPlanMemberRoleDto,[\s\S]*?operator\.role !== 'owner'[\s\S]*?只有创建者可以管理成员角色[\s\S]*?target\.role === 'owner'[\s\S]*?normalizeMemberRole\(dto\.role\)/.test(serviceTs),
  'server should only allow the creator to change non-owner member permission roles'
)

assert(
  wxml.includes('家庭管理')
    && wxml.includes('家庭 ID')
    && wxml.includes('编辑名称')
    && wxml.includes('已绑定微信家人')
    && wxml.includes('家庭身份')
    && wxml.includes('孩子账号')
    && wxml.includes('open-type="share"'),
  'family sheet should be upgraded into a family management surface with sharing'
)

assert(
  wxml.includes('bindtouchstart="onFamilyRowTouchStart"')
    && wxml.includes('bindtouchend="onFamilyRowTouchEnd"')
    && wxml.includes('bindtap="deleteFamily"')
    && wxml.includes('family-row-delete')
    && /openEditFamilyForm\(event\)[\s\S]*?editingFamilyId/.test(pageJs)
    && /submitEditFamily\(\)[\s\S]*?api\.updateFamily/.test(pageJs)
    && /deleteFamily\(event\)[\s\S]*?api\.deleteFamily/.test(pageJs),
  'family list should support edit and left-swipe remove actions'
)

assert(
  /\.family-row \{[\s\S]*?z-index: 2;[\s\S]*?background: #fffdfa;/.test(wxss)
    && /\.family-row\.active \{[\s\S]*?background: #fff4cf;/.test(wxss),
  'family rows should use opaque backgrounds so the swipe delete action does not bleed through'
)

assert(
  /async loadFamilies\(\)[\s\S]*?const families = result\.families \|\| \[\][\s\S]*?families\.find[\s\S]*?familyKey: activeFamily \? activeFamily\.familyKey : ''/.test(pageJs)
    && /async deleteFamily\(event\)[\s\S]*?const remainingFamilies = \(session\.families \|\| \[\]\)\.filter[\s\S]*?activeFamily = session\.activeFamily && session\.activeFamily\.familyId !== familyId/.test(pageJs),
  'family removal should not keep a removed family through stale activeFamily fallback'
)

assert(
  wxml.includes('class="sheet family-form-sheet"')
    && wxml.includes('邀请码已包含身份，加入后直接进入对应家庭。'),
  'join and create family forms should use compact sheets and explain invite role handling'
)

assert(
  wxml.includes('bindchange="onMyRelationChange"')
    && wxml.includes('bindchange="onInviteRoleChange"')
    && wxml.includes('bindchange="onInviteRelationChange"')
    && wxml.includes('bindchange="onMemberRelationChange"')
    && wxml.includes('bindchange="onMemberRoleChange"')
    && wxml.includes('data-member-id="{{item.id}}"')
    && wxml.includes('wx:if="{{item.canManageRelation}}"')
    && wxml.includes('wx:if="{{item.canManageRole}}"')
    && /onMyRelationChange\(event\)[\s\S]*?api\.updateCurrentFamilyMember/.test(pageJs)
    && /onMemberRelationChange\(event\)[\s\S]*?api\.updateFamilyMember/.test(pageJs)
    && /onMemberRoleChange\(event\)[\s\S]*?api\.updateFamilyMemberRole/.test(pageJs)
    && /async createFamilyInvite\(\)[\s\S]*?role: this\.data\.inviteRole[\s\S]*?relation: this\.data\.inviteRelation/.test(pageJs),
  'family management should let current account choose a relation, creator manage member roles, and invite with role plus relation'
)

assert(
  wxml.includes('bindtap="createChildBindInvite"')
    && wxml.includes('绑定微信')
    && wxml.includes('bindtap="previewFamilyChild"')
    && wxml.includes('孩子视角')
    && wxml.includes('data-child-id="{{item.childKey}}"')
    && wxml.includes('生成邀请')
    && wxml.includes('wx:if="{{item.canBindWechat}}"')
    && wxml.includes('管理员')
    && wxml.includes('只读'),
  'family management should expose configurable adult invites, child preview, and child WeChat binding'
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
    && /function decorateInviteInfo\(inviteInfo\)[\s\S]*?孩子绑定码[\s\S]*?家人邀请码/.test(pageJs),
  'client should generate child binding invites and decorate invite copy by role'
)

assert(
  wxml.includes('wx:if="{{parentChildPreviewActive}}"')
    && wxml.includes('bindtap="returnToParentView"')
    && wxml.includes('返回家长'),
  'parent child preview should expose a clear return action in the header'
)

assert(
  wxml.includes('class="children-row" wx:if="{{activeTab !== \'notifications\' && !isChild && children.length > 1}}"'),
  'child preview should hide the sibling switcher and only show the selected child context'
)

assert(
  /parentChildPreviewChildId: ''/.test(pageJs)
    && /previewFamilyChild\(event\)[\s\S]*?parentChildPreviewChildId: childId[\s\S]*?familySwitcherOpen: false[\s\S]*?activeTab: 'today'/.test(pageJs)
    && /returnToParentView\(\)[\s\S]*?parentChildPreviewChildId: ''[\s\S]*?activeTab: 'today'/.test(pageJs)
    && /const isParentChildPreview = baseRole === 'parent'/.test(pageJs)
    && /roleLabel: isParentChildPreview \? '孩子预览'/.test(pageJs),
  'logged-in parents should be able to preview a selected child without changing the session role'
)

assert(
  wxss.includes('.family-manage-card')
    && wxss.includes('.family-member-row')
    && wxss.includes('.family-child-row')
    && wxss.includes('.family-form-sheet')
    && wxss.includes('.family-row-shell')
    && wxss.includes('.family-row-delete')
    && wxss.includes('.family-form-sheet .login-submit-button')
    && wxss.includes('.family-row-status')
    && wxss.includes('.family-relation-card')
    && /\.picker-pill \{[\s\S]*?font-weight: 900;\n\s+white-space: nowrap;[\s\S]*?\n\}/.test(wxss)
    && wxss.includes('.family-member-actions')
    && wxss.includes('.family-member-relation-picker')
    && wxss.includes('.family-member-role-picker')
    && wxss.includes('.invite-setting-row')
    && wxss.includes('grid-template-columns: 104rpx 62rpx minmax(0, 1fr) auto')
    && wxss.includes('overflow-wrap: anywhere')
    && wxss.includes('.family-child-bind-button'),
  'family management UI should have warm styled member rows'
)

console.log('familyPlanFamilyManagement tests passed')
