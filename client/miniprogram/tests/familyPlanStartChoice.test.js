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
  /onLoad\(options = \{\}\)[\s\S]*?if \(!session && !guestSession\) \{[\s\S]*?this\.restoreWechatSessionOnStart\(\)[\s\S]*?return[\s\S]*?\}[\s\S]*?this\.fetchPlan\(\)/.test(pageJs)
    && /async restoreWechatSessionOnStart\(\)[\s\S]*?this\.chooseGuestMode\(\)[\s\S]*?catch \(err\) \{[\s\S]*?this\.chooseGuestMode\(\)/.test(pageJs)
    && !/restoreWechatSessionOnStart\(\)[\s\S]*?this\.setData\(\{ startChoiceOpen: true \}\)/.test(pageJs),
  'first entry without a session should directly enter guest experience after restore check instead of showing a blocking choice modal'
)

assert(
  /chooseGuestMode\(\)[\s\S]*?startChoiceOpen: false[\s\S]*?this\.fetchPlan\(\)/.test(pageJs)
    && /async chooseLoginMode\(\)[\s\S]*?startChoiceOpen: false[\s\S]*?await this\.openLoginForm\(\)/.test(pageJs),
  'choice actions should enter guest mode or start the explicit login flow'
)

assert(
  /logout\(\)[\s\S]*?startChoiceOpen: true/.test(pageJs)
    && !/logout\(\)[\s\S]*?this\.fetchPlan\(\)[\s\S]*?\n  \},\n\n  getOrCreateGuestSession/.test(pageJs),
  'logout should return to the choice screen without creating a guest plan automatically'
)

console.log('familyPlanStartChoice tests passed')
