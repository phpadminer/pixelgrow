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

console.log('familyPlanAccountSession tests passed')
