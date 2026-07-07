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
  /onAccountNicknameInput\(event\)[\s\S]*?accountNickname: event\.detail\.value/.test(pageJs),
  'nickname input should update accountNickname'
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
  wxml.includes('点头像选择微信头像，点昵称输入框选择微信昵称')
    && /async confirmAccountProfileBeforeLogin\(\)[\s\S]*?设置头像昵称[\s\S]*?继续登录[\s\S]*?去设置/.test(pageJs)
    && /async loginWithWechat\(\)[\s\S]*?const profileConfirmed = await this\.confirmAccountProfileBeforeLogin\(\)[\s\S]*?if \(!profileConfirmed\) return/.test(pageJs),
  'login should clearly prompt users to choose avatar and nickname before WeChat login'
)

console.log('familyPlanAccountProfile tests passed')
