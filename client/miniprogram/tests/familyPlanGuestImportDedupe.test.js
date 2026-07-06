const assert = require('assert')
const fs = require('fs')
const path = require('path')

const pageJs = fs.readFileSync(path.join(__dirname, '../pages/family-plan/index.js'), 'utf8')

assert(
  /const makeImportKey = \(\.\.\.parts\) =>/.test(pageJs) && /const findExistingImportItem = \(items, targetKey, makeKey\) =>/.test(pageJs),
  'guest import should compare existing family records before creating new ones'
)

assert(
  pageJs.includes('const existingItem = findExistingImportItem(existingItems, makeKey(payload), makeKey)')
    && pageJs.includes('itemIdMap[`${prefix}:${item.id}`] = existingItem.id')
    && /if \(existingItem\) \{[\s\S]*?continue[\s\S]*?\}/.test(pageJs),
  'guest import should reuse matching course, habit, and task records'
)

assert(
  /const existingGift = findExistingImportItem\(this\.data\.gifts, makeGiftKey\(item\), makeGiftKey\)[\s\S]*?giftIdMap\[item\.id\] = existingGift\.id/.test(pageJs),
  'guest import should reuse matching gifts instead of duplicating seeded gifts'
)

assert(
  /const existingRule = findExistingImportItem\(this\.data\.rules, makeRuleKey\(payload\), makeRuleKey\)[\s\S]*?if \(existingRule\) continue/.test(pageJs),
  'guest import should skip matching rules instead of duplicating seeded rules'
)

console.log('familyPlanGuestImportDedupe tests passed')
