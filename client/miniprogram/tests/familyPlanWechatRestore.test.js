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
  /onLoad\(options = \{\}\)[\s\S]*?if \(!session && !guestSession\) \{[\s\S]*?this\.restoreWechatSessionOnStart\(\)[\s\S]*?return/.test(pageJs),
  'first launch should try to restore an existing WeChat account before showing the start choice'
)

assert(
  /async restoreWechatSessionOnStart\(\)[\s\S]*?const code = await this\.getWechatLoginCode\(\)[\s\S]*?api\.restoreWechatSession\(\{ code \}\)[\s\S]*?this\.applySession\(session/.test(pageJs),
  'silent restore should use wx.login code and apply an existing server session'
)

assert(
  /isWechatRestoreStillCurrent\(\)[\s\S]*?!this\.data\.guestModeStarted[\s\S]*?wx\.getStorageSync\(GUEST_SESSION_KEY\)/.test(pageJs)
    && /async restoreWechatSessionOnStart\(\)[\s\S]*?if \(!this\.isWechatRestoreStillCurrent\(\)\) return[\s\S]*?this\.setData\(\{ startChoiceOpen: true \}\)/.test(pageJs)
    && /chooseGuestMode\(\)[\s\S]*?guestModeStarted: true/.test(pageJs),
  'late silent restore results should not reopen the choice sheet or override an active guest session'
)

assert(
  /async openLoginForm\(\)[\s\S]*?const restored = await this\.restoreWechatSessionFromAction\(\)[\s\S]*?if \(restored\) return[\s\S]*?loginFormOpen: true/.test(pageJs)
    && /async restoreWechatSessionFromAction\(\)[\s\S]*?api\.restoreWechatSession\(\{ code \}\)[\s\S]*?this\.applySession\(session, \{[\s\S]*?familySwitcherOpen: shouldOpenFamilySwitcherOnEntry\(session\)/.test(pageJs),
  'manual login should first restore an existing WeChat account before showing the profile form'
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
