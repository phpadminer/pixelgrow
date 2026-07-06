const MAX_GIFT_IMAGE_BYTES = 200 * 1024
const MAX_CANVAS_LONG_EDGE = 1280
const MIN_CANVAS_LONG_EDGE = 320
const JPEG_DATA_URL_PREFIX = 'data:image/jpeg;base64,'

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function getBase64ByteSize(base64) {
  if (!base64) return 0
  const normalized = String(base64).replace(/\s/g, '')
  if (!normalized) return 0
  const padding = normalized.endsWith('==') ? 2 : normalized.endsWith('=') ? 1 : 0
  return Math.max(0, Math.floor((normalized.length * 3) / 4) - padding)
}

function getDataUrlByteSize(dataUrl) {
  const text = String(dataUrl || '')
  const commaIndex = text.indexOf(',')
  return getBase64ByteSize(commaIndex >= 0 ? text.slice(commaIndex + 1) : text)
}

function isGiftImageDataUrlWithinLimit(dataUrl, maxBytes = MAX_GIFT_IMAGE_BYTES) {
  return getDataUrlByteSize(dataUrl) <= maxBytes
}

function makeGiftImageCompressionPlan(imageInfo = {}) {
  const sourceWidth = Math.max(1, Number(imageInfo.width) || 1)
  const sourceHeight = Math.max(1, Number(imageInfo.height) || 1)
  const sourceSize = Math.max(MAX_GIFT_IMAGE_BYTES, Number(imageInfo.size) || MAX_GIFT_IMAGE_BYTES)
  const longEdge = Math.max(sourceWidth, sourceHeight)
  const longEdgeCapScale = Math.min(1, MAX_CANVAS_LONG_EDGE / longEdge)
  const estimatedScale = clamp(Math.sqrt(MAX_GIFT_IMAGE_BYTES / sourceSize) * 1.35, 0.18, longEdgeCapScale)
  const scales = [
    longEdgeCapScale,
    estimatedScale,
    estimatedScale * 0.85,
    estimatedScale * 0.7,
    estimatedScale * 0.56,
    estimatedScale * 0.44,
    estimatedScale * 0.34,
    estimatedScale * 0.26,
  ]
  const qualities = [0.82, 0.72, 0.62, 0.52, 0.42, 0.34, 0.28, 0.22]
  const seen = {}

  return scales.map((scale, index) => {
    const nextLongEdge = clamp(Math.round(longEdge * scale), MIN_CANVAS_LONG_EDGE, MAX_CANVAS_LONG_EDGE)
    const exactScale = nextLongEdge / longEdge
    const width = Math.max(1, Math.round(sourceWidth * exactScale))
    const height = Math.max(1, Math.round(sourceHeight * exactScale))
    const key = `${width}x${height}@${qualities[index]}`
    if (seen[key]) return null
    seen[key] = true
    return {
      width,
      height,
      quality: qualities[index],
    }
  }).filter(Boolean)
}

function normalizeGiftTitle(value) {
  return String(value || '').trim()
}

function normalizeGiftNumber(value, fallback) {
  const normalized = Number(value)
  return Number.isFinite(normalized) ? normalized : fallback
}

function validateGiftDraft(draft = {}) {
  const title = normalizeGiftTitle(draft.title)
  if (!title) return '礼品名称必填'

  const imageUrl = String(draft.imageUrl || '').trim()
  if (!imageUrl) return '礼品照片必填'
  if (imageUrl.startsWith('data:image/') && !isGiftImageDataUrlWithinLimit(imageUrl)) {
    return '礼品照片不能超过 200KB'
  }

  if (normalizeGiftNumber(draft.pointsCost, 0) < 1) return '兑换积分至少 1 分'
  if (normalizeGiftNumber(draft.stock, -1) < 0) return '库存不能小于 0'
  return ''
}

function buildGiftPayload(draft = {}) {
  return {
    title: normalizeGiftTitle(draft.title),
    description: String(draft.description || '').trim(),
    imageUrl: String(draft.imageUrl || '').trim(),
    pointsCost: Math.max(1, Math.round(normalizeGiftNumber(draft.pointsCost, 1))),
    stock: Math.max(0, Math.round(normalizeGiftNumber(draft.stock, 0))),
    active: draft.active !== false,
  }
}

module.exports = {
  JPEG_DATA_URL_PREFIX,
  MAX_GIFT_IMAGE_BYTES,
  buildGiftPayload,
  getDataUrlByteSize,
  isGiftImageDataUrlWithinLimit,
  makeGiftImageCompressionPlan,
  validateGiftDraft,
}
