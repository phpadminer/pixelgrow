const assert = require('assert')

const {
  MAX_GIFT_IMAGE_BYTES,
  buildGiftPayload,
  getDataUrlByteSize,
  isGiftImageDataUrlWithinLimit,
  makeGiftImageCompressionPlan,
  validateGiftDraft,
} = require('../utils/familyPlanGiftImage')

function makeDataUrl(byteLength) {
  return `data:image/jpeg;base64,${Buffer.alloc(byteLength).toString('base64')}`
}

assert.strictEqual(MAX_GIFT_IMAGE_BYTES, 200 * 1024)

const maxSizeDataUrl = makeDataUrl(MAX_GIFT_IMAGE_BYTES)
assert.strictEqual(getDataUrlByteSize(maxSizeDataUrl), MAX_GIFT_IMAGE_BYTES)
assert.strictEqual(isGiftImageDataUrlWithinLimit(maxSizeDataUrl), true)
assert.strictEqual(isGiftImageDataUrlWithinLimit(makeDataUrl(MAX_GIFT_IMAGE_BYTES + 1)), false)

const compressionPlan = makeGiftImageCompressionPlan({
  width: 4000,
  height: 3000,
  size: 4 * 1024 * 1024,
})
assert(compressionPlan.length >= 4, 'large photos should get multiple compression attempts')
assert(compressionPlan[0].width <= 1280, 'first canvas attempt should cap the long edge')
assert(compressionPlan[0].width > compressionPlan[compressionPlan.length - 1].width, 'later attempts should downscale further')
assert(compressionPlan[0].quality > compressionPlan[compressionPlan.length - 1].quality, 'later attempts should reduce quality further')

assert.strictEqual(
  validateGiftDraft({
    title: '  乐高小车  ',
    imageUrl: makeDataUrl(1024),
    pointsCost: '12',
    stock: '2',
    active: true,
  }),
  ''
)
assert.strictEqual(
  buildGiftPayload({
    title: '  乐高小车  ',
    description: '  周末兑换  ',
    imageUrl: makeDataUrl(1024),
    pointsCost: '12',
    stock: '2',
    active: true,
  }).title,
  '乐高小车'
)
assert.strictEqual(validateGiftDraft({ title: '', imageUrl: makeDataUrl(1024) }), '礼品名称必填')
assert.strictEqual(validateGiftDraft({ title: '乐高小车', imageUrl: '' }), '礼品照片必填')
assert.strictEqual(validateGiftDraft({ title: '乐高小车', imageUrl: makeDataUrl(MAX_GIFT_IMAGE_BYTES + 1) }), '礼品照片不能超过 200KB')

console.log('familyPlanGiftImage tests passed')
