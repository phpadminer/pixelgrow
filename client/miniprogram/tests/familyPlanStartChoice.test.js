const assert = require('assert')
const fs = require('fs')
const path = require('path')

const pageJs = fs.readFileSync(path.join(__dirname, '../pages/family-plan/index.js'), 'utf8')
const wxml = fs.readFileSync(path.join(__dirname, '../pages/family-plan/index.wxml'), 'utf8')

assert(
  wxml.includes('wx:if="{{startChoiceOpen}}"')
    && wxml.includes('游客体验')
    && wxml.includes('登录使用')
    && wxml.includes('bindtap="chooseGuestMode"')
    && wxml.includes('bindtap="chooseLoginMode"'),
  'first entry should let users choose guest mode or login before using the app'
)

assert(
  /onLoad\(\)[\s\S]*?if \(!session && !guestSession\) \{[\s\S]*?startChoiceOpen: true[\s\S]*?return[\s\S]*?\}[\s\S]*?this\.fetchPlan\(\)/.test(pageJs),
  'first entry without a session should show the choice screen and avoid creating guest data immediately'
)

assert(
  /chooseGuestMode\(\)[\s\S]*?startChoiceOpen: false[\s\S]*?this\.fetchPlan\(\)/.test(pageJs)
    && /chooseLoginMode\(\)[\s\S]*?startChoiceOpen: false[\s\S]*?loginFormOpen: true/.test(pageJs),
  'choice actions should enter guest mode or open login explicitly'
)

assert(
  /logout\(\)[\s\S]*?startChoiceOpen: true/.test(pageJs)
    && !/logout\(\)[\s\S]*?this\.fetchPlan\(\)[\s\S]*?\n  \},\n\n  getOrCreateGuestSession/.test(pageJs),
  'logout should return to the choice screen without creating a guest plan automatically'
)

console.log('familyPlanStartChoice tests passed')
