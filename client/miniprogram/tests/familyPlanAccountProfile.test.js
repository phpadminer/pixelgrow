const assert = require('assert')
const fs = require('fs')
const path = require('path')

const pageJs = fs.readFileSync(path.join(__dirname, '../pages/family-plan/index.js'), 'utf8')
const wxml = fs.readFileSync(path.join(__dirname, '../pages/family-plan/index.wxml'), 'utf8')

assert(
  pageJs.includes("accountNickname: ''") && pageJs.includes("accountAvatarUrl: ''") && pageJs.includes("accountRoleLabel: '家长'"),
  'page state should keep editable WeChat account profile fields'
)

assert(
  /onAccountNicknameInput\(event\)[\s\S]*?accountNickname: event\.detail\.value[\s\S]*?accountAvatarText: getAccountInitial\(event\.detail\.value\)/.test(pageJs),
  'nickname input should update accountNickname and the fallback avatar text'
)

assert(
  /onAccountAvatarChoose\(event\)[\s\S]*?accountAvatarUrl: event\.detail\.avatarUrl/.test(pageJs),
  'avatar chooser should update accountAvatarUrl'
)

assert(
  /api\.loginWechat\(\{[\s\S]*?code,[\s\S]*?nickname: String\(this\.data\.accountNickname \|\| ''\)\.trim\(\),[\s\S]*?avatarUrl: this\.data\.accountAvatarUrl \|\| '',[\s\S]*?\}\)/.test(pageJs),
  'WeChat login should submit nickname and avatarUrl to the backend'
)

assert(
  /applySession\(session, extraPatch = \{\}\)[\s\S]*?const account = session && session\.account \? session\.account : null[\s\S]*?accountNickname: account && account\.nickname \? account\.nickname : this\.data\.accountNickname[\s\S]*?accountAvatarUrl: account && account\.avatarUrl \? account\.avatarUrl : this\.data\.accountAvatarUrl/.test(pageJs),
  'session hydration should reflect the current WeChat nickname and avatar in page state'
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
  wxml.includes('保存并替换微信资料')
    && wxml.includes('bindtap="openAccountProfileForm"')
    && wxml.includes('更新资料')
    && /openAccountProfileForm\(\)[\s\S]*?loginFormOpen: true[\s\S]*?familySwitcherOpen: false/.test(pageJs),
  'login action and current account row should make avatar and nickname replacement explicit'
)

console.log('familyPlanAccountProfile tests passed')
