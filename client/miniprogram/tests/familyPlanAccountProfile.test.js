const assert = require('assert')
const fs = require('fs')
const path = require('path')

const pageJs = fs.readFileSync(path.join(__dirname, '../pages/family-plan/index.js'), 'utf8')

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

console.log('familyPlanAccountProfile tests passed')
