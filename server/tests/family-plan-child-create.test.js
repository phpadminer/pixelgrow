const assert = require('assert')
const fs = require('fs')
const path = require('path')

const controller = fs.readFileSync(path.join(__dirname, '../src/modules/family-plan/family-plan.controller.ts'), 'utf8')
const dto = fs.readFileSync(path.join(__dirname, '../src/modules/family-plan/family-plan.dto.ts'), 'utf8')
const service = fs.readFileSync(path.join(__dirname, '../src/modules/family-plan/family-plan.service.ts'), 'utf8')

assert(
  dto.includes('export class CreateFamilyPlanChildDto extends UpdateFamilyPlanChildDto {}'),
  'child creation should reuse the child profile payload'
)

assert(
  /@Post\('children'\)[\s\S]*?createChild\(@Body\(\) dto: CreateFamilyPlanChildDto, @Headers\('authorization'\) authorization\?: string\)/.test(controller),
  'controller should expose POST /family-plan/children'
)

assert(
  /async createChild\(dto: CreateFamilyPlanChildDto, authorization\?: string\)[\s\S]*?this\.assertParentIfAuthenticated\(authorization\)[\s\S]*?childKey: await this\.createUniqueChildKey\(familyKey\)[\s\S]*?return this\.serializeChild\(child\)/.test(service),
  'service should create a child in the resolved family and return the serialized child'
)

console.log('family-plan child create tests passed')
