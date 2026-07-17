const assert = require('assert')
const fs = require('fs')
const path = require('path')

const pageJs = fs.readFileSync(path.join(__dirname, '../pages/family-plan/index.js'), 'utf8')
const shouldOpenFamilySwitcherSource = pageJs.match(/function shouldOpenFamilySwitcherOnEntry\(session\) \{[\s\S]*?\n\}/)?.[0]
const shouldOpenFamilySwitcherOnEntry = Function(
  'getActiveFamily',
  `${shouldOpenFamilySwitcherSource}; return shouldOpenFamilySwitcherOnEntry`
)((session) => {
  if (!session) return null
  if (session.activeFamily) return session.activeFamily
  if (!session.familyKey) return null
  return { familyKey: session.familyKey }
})

assert(
  /async ensureActiveFamilySession\(\)[\s\S]*?api\.listFamilies\(session\)[\s\S]*?api\.switchFamily\(familyIdentity, session\)[\s\S]*?this\.applySession\(switchedSession\)/.test(pageJs),
  'logged-in parent accounts with an existing family should be switched into an active family session automatically'
)

assert(
  /async fetchPlan\(\)[\s\S]*?await this\.ensureActiveFamilySession\(\)[\s\S]*?plan = await api\.loadPlan\(this\.data\.session\)/.test(pageJs),
  'plan loading should hydrate stale account sessions before loading family data'
)

assert(
  /function shouldOpenFamilySwitcherOnEntry\(session\)[\s\S]*?session\.role === 'parent'[\s\S]*?session\.account[\s\S]*?!getActiveFamily\(session\)/.test(pageJs),
  'parent accounts should only auto-open family management when there is no active family'
)

assert(
  /onLoad\(options = \{\}\)[\s\S]*?familySwitcherOpen: shouldOpenFamilySwitcherOnEntry\(session\)/.test(pageJs)
    && /restoreWechatSessionOnStart\(\)[\s\S]*?this\.applySession\(session, \{[\s\S]*?familySwitcherOpen: shouldOpenFamilySwitcherOnEntry\(session\)/.test(pageJs)
    && /loginWithWechat\(\)[\s\S]*?this\.applySession\(session, \{[\s\S]*?familySwitcherOpen: shouldOpenFamilySwitcherOnEntry\(session\)/.test(pageJs),
  'cached, restored, and explicit WeChat logins should use the same family management entry rule'
)

assert.strictEqual(
  shouldOpenFamilySwitcherOnEntry({
    role: 'parent',
    account: { id: 'account-1' },
    activeFamily: { familyKey: 'family-1' },
    familyKey: 'family-1',
    families: [{ familyKey: 'family-1' }]
  }),
  false,
  'parent accounts with an active family should not be interrupted by family management on entry'
)

assert.strictEqual(
  shouldOpenFamilySwitcherOnEntry({
    role: 'parent',
    account: { id: 'account-1' },
    families: [{ familyKey: 'family-1' }]
  }),
  true,
  'parent accounts without an active family should still be guided to choose or create a family'
)

console.log('familyPlanAccountSession tests passed')
