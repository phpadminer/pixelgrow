const assert = require('assert')
const fs = require('fs')
const path = require('path')

const service = fs.readFileSync(path.join(__dirname, '../src/modules/family-plan/family-plan.service.ts'), 'utf8')

assert(
  service.includes("const AUDIT_FAMILY_KEY = 'audit-family'"),
  'service should define an isolated audit family key'
)

assert(
  /async loginParent[\s\S]*?ensureSeedData\(AUDIT_FAMILY_KEY\)/.test(service),
  'legacy parent demo login should use audit-family, not the user family'
)

assert(
  /async loginChild[\s\S]*?familyKey:\s*AUDIT_FAMILY_KEY/.test(service),
  'child audit login should sign into audit-family'
)

assert(
  !/async loginChild[\s\S]*?familyKey:\s*DEFAULT_FAMILY_KEY/.test(service),
  'child audit login must not sign into demo-family'
)

console.log('family-plan audit isolation tests passed')
