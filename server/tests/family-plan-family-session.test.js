const assert = require('assert')
const fs = require('fs')
const path = require('path')

const service = fs.readFileSync(path.join(__dirname, '../src/modules/family-plan/family-plan.service.ts'), 'utf8')

assert(
  /async createFamily\(dto: CreateFamilyPlanFamilyDto, authorization\?: string\)[\s\S]*?const membership = await this\.getMembership\(session\.accountId, family\.id\)[\s\S]*?return this\.toParentAuthResult\(session\.accountId, membership\)/.test(service),
  'creating a family should return a parent session for the newly created family'
)

assert(
  /private async toParentAuthResult\(accountId: string, membership\)[\s\S]*?const activeFamily = serializeFamilyMembership\(membership\)[\s\S]*?familyKey: activeFamily\.familyKey[\s\S]*?activeFamily[\s\S]*?families/.test(service),
  'parent auth result should include activeFamily, familyKey, and family list'
)

console.log('family-plan family session tests passed')
