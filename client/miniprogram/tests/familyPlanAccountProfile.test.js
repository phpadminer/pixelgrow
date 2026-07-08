const assert = require('assert')
const fs = require('fs')
const path = require('path')

const pageJs = fs.readFileSync(path.join(__dirname, '../pages/family-plan/index.js'), 'utf8')
const wxml = fs.readFileSync(path.join(__dirname, '../pages/family-plan/index.wxml'), 'utf8')
const schema = fs.readFileSync(path.join(__dirname, '../../../server/prisma/schema.prisma'), 'utf8')
const serviceTs = fs.readFileSync(path.join(__dirname, '../../../server/src/modules/family-plan/family-plan.service.ts'), 'utf8')
const controllerTs = fs.readFileSync(path.join(__dirname, '../../../server/src/modules/family-plan/family-plan.controller.ts'), 'utf8')

assert(
  pageJs.includes("accountNickname: ''") && pageJs.includes("accountAvatarUrl: ''") && pageJs.includes("accountRoleLabel: '家长'"),
  'page state should keep editable WeChat account profile fields'
)

assert(
  /onAccountNicknameInput\(event\)[\s\S]*?accountNickname: event\.detail\.value[\s\S]*?accountAvatarText: getAccountInitial\(event\.detail\.value\)/.test(pageJs),
  'nickname input should update accountNickname and the fallback avatar text'
)

assert(
  /async onAccountAvatarChoose\(event\)[\s\S]*?this\.accountAvatarPayload = await this\.prepareAccountAvatarUrl\(avatarUrl\)/.test(pageJs)
    && /prepareAccountAvatarUrl\(avatarUrl\)[\s\S]*?wx\.getFileSystemManager\(\)[\s\S]*?encoding: 'base64'[\s\S]*?data:image\/jpeg;base64,/.test(pageJs),
  'avatar chooser should keep base64 avatar payload out of setData while still submitting a portable avatar'
)

assert(
  !pageJs.includes('accountAvatarUrl: portableAvatarUrl'),
  'base64 avatar data url must not be written into setData'
)

assert(
  /function getRenderableAccountAvatarUrl\(avatarUrl\)[\s\S]*?\^data:image\\\/[\s\S]*?return ''[\s\S]*?\^https\?:\\\/\\\//.test(pageJs)
    && /function decorateFamilyMember\(member,[\s\S]*?avatarUrl: getRenderableAccountAvatarUrl\(member\.avatarUrl\)/.test(pageJs),
  'family member list should only render http account avatar urls and avoid data-url payloads in page data'
)

assert(
  /api\.loginWechat\(\{[\s\S]*?code,[\s\S]*?nickname: String\(this\.data\.accountNickname \|\| ''\)\.trim\(\),[\s\S]*?avatarUrl: this\.accountAvatarPayload \|\| getRenderableAccountAvatarUrl\(this\.data\.accountAvatarUrl\),[\s\S]*?\}\)/.test(pageJs),
  'WeChat login should submit nickname and avatarUrl to the backend'
)

assert(
  /function sanitizeSessionForRender\(session\)[\s\S]*?getRenderableAccountAvatarUrl\(account\.avatarUrl\)[\s\S]*?applySession/.test(pageJs)
    && /applySession\(session, extraPatch = \{\}\)[\s\S]*?const renderSession = sanitizeSessionForRender\(session\)[\s\S]*?accountAvatarUrl: account && account\.avatarUrl \? getRenderableAccountAvatarUrl\(account\.avatarUrl\) : this\.data\.accountAvatarUrl/.test(pageJs),
  'session hydration should strip raw data-url avatars before writing session data into setData'
)

assert(
  wxml.includes('点头像选择微信头像，点昵称输入框选择微信昵称')
    && /async confirmAccountProfileBeforeLogin\(\)[\s\S]*?设置头像昵称[\s\S]*?继续登录[\s\S]*?去设置/.test(pageJs)
    && /async loginWithWechat\(\)[\s\S]*?const profileConfirmed = await this\.confirmAccountProfileBeforeLogin\(\)[\s\S]*?if \(!profileConfirmed\) return/.test(pageJs),
  'login should clearly prompt users to choose avatar and nickname before WeChat login'
)

assert(
  wxml.includes('class="account-chip"')
    && wxml.includes("{{account.nickname || accountNickname || name || '微信用户'}}")
    && wxml.includes('account-chip-avatar'),
  'logged-in users should see their own WeChat name in the header'
)

assert(
  /function needsWechatProfile\(session\)[\s\S]*?nickname === '微信用户'[\s\S]*?!account\.avatarUrl/.test(pageJs)
    && /onLoad\(options = \{\}\)[\s\S]*?const shouldCompleteProfile = needsWechatProfile\(session\)[\s\S]*?accountNickname: session && session\.account && session\.account\.nickname \? session\.account\.nickname : ''[\s\S]*?loginFormOpen: shouldCompleteProfile[\s\S]*?familySwitcherOpen: !shouldCompleteProfile && shouldOpenFamilySwitcherOnEntry\(session\)/.test(pageJs)
    && /restoreWechatSessionOnStart\(\)[\s\S]*?const shouldCompleteProfile = needsWechatProfile\(session\)[\s\S]*?loginFormOpen: shouldCompleteProfile[\s\S]*?familySwitcherOpen: !shouldCompleteProfile && shouldOpenFamilySwitcherOnEntry\(session\)/.test(pageJs)
    && /restoreWechatSessionFromAction\(\)[\s\S]*?const shouldCompleteProfile = needsWechatProfile\(session\)[\s\S]*?loginFormOpen: shouldCompleteProfile/.test(pageJs),
  'cached and restored WeChat accounts without profile details should be prompted to complete avatar and nickname'
)

assert(
  /model FamilyPlanAccount[\s\S]*?avatarUrl\s+String\?\s+@db\.LongText/.test(schema),
  'account avatarUrl should be long text because WeChat avatar data urls can exceed varchar length'
)

assert(
  /function serializeAccount\(account\)[\s\S]*?avatarUrl: getAccountAvatarPublicUrl\(account\)/.test(serviceTs)
    && /members: members\.map\(\(member\) => \(\{[\s\S]*?avatarUrl: getAccountAvatarPublicUrl\(member\.account\)/.test(serviceTs),
  'server should return public avatar image urls instead of raw base64 payloads in account and family member JSON'
)

assert(
  /@Get\('accounts\/:accountId\/avatar'\)[\s\S]*?getAccountAvatar/.test(controllerTs)
    && /async getAccountAvatar\(accountId: string\)[\s\S]*?parseAccountAvatarDataUrl/.test(serviceTs),
  'server should expose account avatar image endpoint backed by stored data-url avatar payload'
)

assert(
  wxml.includes('保存并替换微信资料')
    && wxml.includes('bindtap="openAccountProfileForm"')
    && wxml.includes('更新资料')
    && /openAccountProfileForm\(\)[\s\S]*?loginFormOpen: true[\s\S]*?familySwitcherOpen: false/.test(pageJs),
  'login action and current account row should make avatar and nickname replacement explicit'
)

console.log('familyPlanAccountProfile tests passed')
