const assert = require('assert')
const fs = require('fs')
const path = require('path')

const pageJs = fs.readFileSync(path.join(__dirname, '../pages/family-plan/index.js'), 'utf8')

assert(
  /async ensureActiveFamilySession\(\)[\s\S]*?api\.listFamilies\(session\)[\s\S]*?api\.switchFamily\(familyIdentity, session\)[\s\S]*?this\.applySession\(switchedSession\)/.test(pageJs),
  'logged-in parent accounts with an existing family should be switched into an active family session automatically'
)

assert(
  /async fetchPlan\(\)[\s\S]*?await this\.ensureActiveFamilySession\(\)[\s\S]*?plan = await api\.loadPlan\(this\.data\.session\)/.test(pageJs),
  'plan loading should hydrate stale account sessions before loading family data'
)

assert(
  /function shouldOpenFamilySwitcherOnEntry\(session\)[\s\S]*?session\.role === 'parent'[\s\S]*?session\.account[\s\S]*?session\.families\.length > 0/.test(pageJs),
  'parent accounts with families should be recognized as needing the family chooser on entry'
)

assert(
  /onLoad\(\)[\s\S]*?familySwitcherOpen: shouldOpenFamilySwitcherOnEntry\(session\)/.test(pageJs)
    && /restoreWechatSessionOnStart\(\)[\s\S]*?this\.applySession\(session, \{[\s\S]*?familySwitcherOpen: shouldOpenFamilySwitcherOnEntry\(session\)/.test(pageJs)
    && /loginWithWechat\(\)[\s\S]*?this\.applySession\(session, \{[\s\S]*?familySwitcherOpen: shouldOpenFamilySwitcherOnEntry\(session\)/.test(pageJs),
  'cached, restored, and explicit WeChat logins should open the family chooser when families exist'
)

console.log('familyPlanAccountSession tests passed')
