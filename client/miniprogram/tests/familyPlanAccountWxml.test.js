const assert = require('assert')
const fs = require('fs')
const path = require('path')

const wxml = fs.readFileSync(path.join(__dirname, '../pages/family-plan/index.wxml'), 'utf8')

assert(
  wxml.includes('bindtap="loginWithWechat"'),
  'parent account login should use explicit WeChat login action'
)

assert(
  wxml.includes('家庭模式'),
  'login sheet should clearly label persistent family mode'
)

assert(
  wxml.includes('游客模式'),
  'login sheet should mention temporary guest mode'
)

assert(
  !wxml.includes('bindtap="switchLoginRole"') && !wxml.includes('data-role="child"'),
  'main login sheet should not expose a child login role switch'
)

assert(
  !wxml.includes('data-field="childCode"') && !wxml.includes('data-field="pinCode"'),
  'main login sheet should not expose child code or PIN fields'
)

assert(
  !wxml.includes('孩子 GEGE01') && !wxml.includes('MEIMEI01 / 2580'),
  'main login helper should not mix child audit accounts into the public login flow'
)

assert(
  wxml.includes('数据临时'),
  'guest mode copy should make temporary data explicit'
)

assert(
  wxml.includes('bindtap="openFamilySwitcher"'),
  'logged-in parent should be able to switch families'
)

assert(
  wxml.includes('bindtap="openJoinFamilyForm"'),
  'logged-in parent should be able to join by invite code'
)

assert(
  wxml.includes('bindtap="openCreateFamilyForm"'),
  'logged-in parent should be able to create a family'
)

assert(
  wxml.includes('inviteCode'),
  'join form should expose inviteCode input'
)

assert(
  !wxml.includes('button open-type="getPhoneNumber"'),
  'family-plan login must not require phone authorization'
)

console.log('familyPlanAccountWxml tests passed')
