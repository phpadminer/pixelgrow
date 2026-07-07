const assert = require('assert')
const fs = require('fs')
const path = require('path')

const pageJs = fs.readFileSync(path.join(__dirname, '../pages/family-plan/index.js'), 'utf8')
const wxml = fs.readFileSync(path.join(__dirname, '../pages/family-plan/index.wxml'), 'utf8')
const wxss = fs.readFileSync(path.join(__dirname, '../pages/family-plan/index.wxss'), 'utf8')

assert(
  wxml.includes('guestPreviewSwitchVisible')
    && wxml.includes('guestPreviewRole === \'parent\'')
    && wxml.includes('guestPreviewRole === \'child\'')
    && wxml.includes('bindtap="switchGuestPreviewRole"')
    && wxml.includes('家长预览')
    && wxml.includes('孩子预览'),
  'guest mode should expose a parent/child preview switch near the top'
)

assert(
  /guestPreviewRole: 'parent'/.test(pageJs)
    && /switchGuestPreviewRole\(event\)[\s\S]*?event\.currentTarget\.dataset\.role === 'child' \? 'child' : 'parent'[\s\S]*?this\.refreshView\(\{ guestPreviewRole: role, activeTab: 'today' \}\)/.test(pageJs),
  'guest preview switch should default to parent and refresh the view when changed'
)

assert(
  /const isGuestChildPreview = isGuest && guestPreviewRole === 'child'/.test(pageJs)
    && /const role = isGuestChildPreview \|\| isParentChildPreview \? 'child' : baseRole/.test(pageJs)
    && /const canManagePlan = baseRole === 'parent' && !isParentChildPreview \? Boolean\(state\.activeFamily\) : isGuestParentPreview/.test(pageJs),
  'child preview should use child tabs while only parent views can manage plans'
)

assert(
  /const canActAsParent = role === 'parent' \|\| isGuestParentPreview/.test(pageJs)
    && /canUndoCompletion: canActAsParent/.test(pageJs),
  'guest child preview should not get parent-only undo controls'
)

assert(
  wxss.includes('.guest-preview-switch')
    && wxss.includes('.guest-preview-option.active')
    && wxss.includes('#f5a316'),
  'guest preview switch should keep the warm yellow visual style'
)

console.log('familyPlanGuestPreview tests passed')
