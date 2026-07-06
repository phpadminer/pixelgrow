const assert = require('assert')
const fs = require('fs')
const path = require('path')

const controller = fs.readFileSync(path.join(__dirname, '../src/modules/family-plan/family-plan.controller.ts'), 'utf8')
const service = fs.readFileSync(path.join(__dirname, '../src/modules/family-plan/family-plan.service.ts'), 'utf8')

assert(
  /@Delete\('gifts\/:id'\)[\s\S]*?deleteGift\(@Param\('id'\) id: string, @Query\('familyKey'\) familyKey\?: string, @Headers\('authorization'\) authorization\?: string\)/.test(controller),
  'controller should expose DELETE /family-plan/gifts/:id'
)

assert(
  /return this\.familyPlanService\.deleteGift\(id, familyKey, authorization\)/.test(controller),
  'controller should call familyPlanService.deleteGift'
)

assert(
  /async deleteGift\(id: string, familyKey = DEFAULT_FAMILY_KEY, authorization\?: string\)[\s\S]*?this\.prisma\.familyPlanGift\.deleteMany\(\{ where: \{ id, familyKey: resolvedFamilyKey \} \}\)/.test(service),
  'service should delete gifts within the resolved family only'
)

console.log('family-plan gift delete tests passed')
