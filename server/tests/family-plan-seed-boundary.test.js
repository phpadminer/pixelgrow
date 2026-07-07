const assert = require('assert')
const fs = require('fs')
const path = require('path')

const service = fs.readFileSync(path.join(__dirname, '../src/modules/family-plan/family-plan.service.ts'), 'utf8')

assert(
  /private shouldSeedFamilyData\(familyKey: string\)[\s\S]*?familyKey === AUDIT_FAMILY_KEY[\s\S]*?familyKey === DEFAULT_FAMILY_KEY/.test(service),
  'service should only seed dedicated audit/demo families'
)

assert(
  !/async createFamily\(dto: CreateFamilyPlanFamilyDto, authorization\?: string\)[\s\S]*?ensureSeedData\(family\.familyKey\)/.test(service),
  'new user-created families must not receive demo children or demo tasks automatically'
)

assert(
  /async getPlan\(familyKey = DEFAULT_FAMILY_KEY, authorization\?: string\)[\s\S]*?if \(this\.shouldSeedFamilyData\(resolvedFamilyKey\)\) \{[\s\S]*?await this\.ensureSeedData\(resolvedFamilyKey\)[\s\S]*?\}/.test(service),
  'plan loading should seed only audit/demo families'
)

assert(
  /async joinInvite\(dto: JoinFamilyPlanInviteDto, authorization\?: string\)[\s\S]*?if \(this\.shouldSeedFamilyData\(invite\.family\.familyKey\)\) \{[\s\S]*?await this\.ensureSeedData\(invite\.family\.familyKey\)[\s\S]*?\}/.test(service),
  'joining a normal family must not seed demo data'
)

console.log('family-plan seed boundary tests passed')
