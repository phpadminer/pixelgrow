const assert = require('assert')
const fs = require('fs')
const path = require('path')

const pageJs = fs.readFileSync(path.join(__dirname, '../pages/family-plan/index.js'), 'utf8')
const apiJs = fs.readFileSync(path.join(__dirname, '../utils/familyPlanApi.js'), 'utf8')
const controllerTs = fs.readFileSync(path.join(__dirname, '../../../server/src/modules/family-plan/family-plan.controller.ts'), 'utf8')
const serviceTs = fs.readFileSync(path.join(__dirname, '../../../server/src/modules/family-plan/family-plan.service.ts'), 'utf8')

assert(
  /function restoreWechatSession\(payload\)[\s\S]*?\/family-plan\/auth\/wechat\/restore/.test(apiJs),
  'client api should expose a no-create WeChat session restore endpoint'
)

assert(
  /onLoad\(\)[\s\S]*?if \(!session && !guestSession\) \{[\s\S]*?this\.restoreWechatSessionOnStart\(\)[\s\S]*?return/.test(pageJs),
  'first launch should try to restore an existing WeChat account before showing the start choice'
)

assert(
  /async restoreWechatSessionOnStart\(\)[\s\S]*?const code = await this\.getWechatLoginCode\(\)[\s\S]*?api\.restoreWechatSession\(\{ code \}\)[\s\S]*?this\.applySession\(session/.test(pageJs),
  'silent restore should use wx.login code and apply an existing server session'
)

assert(
  /@Post\('auth\/wechat\/restore'\)[\s\S]*?restoreWechatSession\(@Body\(\) dto: WechatFamilyPlanLoginDto\)/.test(controllerTs),
  'server should expose a dedicated WeChat restore endpoint'
)

assert(
  /async restoreWechatSession\(dto: WechatFamilyPlanLoginDto\)[\s\S]*?findUnique\(\{ where: \{ wechatOpenId \} \}\)[\s\S]*?if \(!account && !legacyUser\)[\s\S]*?return \{ session: null \}/.test(serviceTs),
  'restore should only return an existing account and must not create accounts for new visitors'
)

console.log('familyPlanWechatRestore tests passed')
