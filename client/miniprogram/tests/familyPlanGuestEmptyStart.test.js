const assert = require('assert')
const fs = require('fs')
const path = require('path')

const pageJs = fs.readFileSync(path.join(__dirname, '../pages/family-plan/index.js'), 'utf8')

assert(
  /function emptyGuestPlan\(\)[\s\S]*?children: \[\][\s\S]*?courses: \[\][\s\S]*?gifts: \[\]/.test(pageJs),
  'guest mode should have an explicit empty initial plan'
)

assert(
  /async fetchPlan\(\)[\s\S]*?if \(this\.data\.isGuest\) \{[\s\S]*?plan = this\.getStoredGuestPlan\(\) \|\| emptyGuestPlan\(\)[\s\S]*?this\.storeGuestPlan\(plan\)/.test(pageJs),
  'first guest load should use an empty local plan'
)

assert(
  !/if \(this\.data\.isGuest\) \{[\s\S]*?api\.loadPlan\(null\)[\s\S]*?\} else \{/.test(pageJs),
  'guest mode must not load audit/demo family data on first entry'
)

console.log('familyPlanGuestEmptyStart tests passed')
