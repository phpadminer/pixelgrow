const assert = require('assert')
const fs = require('fs')
const path = require('path')

const schema = fs.readFileSync(path.join(__dirname, '../prisma/schema.prisma'), 'utf8')

assert(schema.includes('model FamilyPlanAccount'), 'schema should define FamilyPlanAccount')
assert(/wechatOpenId\s+String\s+@unique/.test(schema), 'account should keep unique WeChat openid')
assert(/legacyUserId\s+String\?\s+@unique/.test(schema), 'account should preserve a pointer to existing PixelGrow User data')
assert(schema.includes('model FamilyPlanFamily'), 'schema should define FamilyPlanFamily')
assert(/familyKey\s+String\s+@unique/.test(schema), 'family should keep unique compatibility familyKey')
assert(schema.includes('model FamilyPlanFamilyMember'), 'schema should define FamilyPlanFamilyMember')
assert(schema.includes('@@unique([familyId, accountId])'), 'membership should prevent duplicate family joins')
assert(schema.includes('model FamilyPlanInvite'), 'schema should define FamilyPlanInvite')
assert(/inviteCode\s+String\s+@unique/.test(schema), 'invite code should be unique')

console.log('family-plan account schema tests passed')
