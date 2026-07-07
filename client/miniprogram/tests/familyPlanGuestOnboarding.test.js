const assert = require('assert')
const fs = require('fs')
const path = require('path')

const pageJs = fs.readFileSync(path.join(__dirname, '../pages/family-plan/index.js'), 'utf8')
const wxml = fs.readFileSync(path.join(__dirname, '../pages/family-plan/index.wxml'), 'utf8')

assert(
  wxml.includes('guestOnboardingVisible') && wxml.includes('先创建一个临时孩子') && wxml.includes('bindtap="createDefaultGuestChild"'),
  'guest mode should show a step-by-step onboarding card that creates a temporary child'
)

assert(
  /function defaultGuestChild\(\)[\s\S]*?id: `guest-child-\$\{suffix\}`[\s\S]*?name: '我的孩子'[\s\S]*?avatar: 'lamb'/.test(pageJs)
    && /createDefaultGuestChild\(\)[\s\S]*?const child = defaultGuestChild\(\)[\s\S]*?this\.refreshGuestPlan\(\{ children, selectedChildId: child\.id \}\)/.test(pageJs),
  'guest onboarding should create a default temporary child in local storage'
)

assert(
  /const childIdMap = \{\}[\s\S]*?api\.createChildProfile\(\{[\s\S]*?name: child\.name[\s\S]*?avatar: child\.avatar[\s\S]*?grade: child\.grade[\s\S]*?\}, session\)[\s\S]*?childIdMap\[child\.id\] = created\.id/.test(pageJs),
  'saving a guest plan should create real family children before importing child-bound records'
)

console.log('familyPlanGuestOnboarding tests passed')
