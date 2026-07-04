const request = require('./request')

const FAMILY_KEY = 'demo-family'

function getAuthOptions(session) {
  return session && session.token
    ? { header: { Authorization: `Bearer ${session.token}` }, skipAuth: true }
    : { skipAuth: true }
}

function loadPlan(session) {
  const cacheBust = `_t=${Date.now()}`
  if (session && session.token) {
    return request.get(`/family-plan?${cacheBust}`, {}, getAuthOptions(session))
  }
  return request.get(`/family-plan?familyKey=${encodeURIComponent(FAMILY_KEY)}&${cacheBust}`, {}, { skipAuth: true })
}

function loginParent(payload) {
  return request.post('/family-plan/auth/parent', payload, { skipAuth: true })
}

function loginChild(payload) {
  return request.post('/family-plan/auth/child', payload, { skipAuth: true })
}

function updateCompletion(itemKey, completed, session, options = {}) {
  return request.put(
    `/family-plan/completions/${encodeURIComponent(itemKey)}`,
    { familyKey: FAMILY_KEY, completed, isMakeup: Boolean(options.isMakeup) },
    getAuthOptions(session)
  )
}

function createPlanItem(type, payload, session) {
  return request.post(
    `/family-plan/${type}`,
    Object.assign({ familyKey: FAMILY_KEY }, payload),
    getAuthOptions(session)
  )
}

function updatePlanItem(type, id, payload, session) {
  return request.put(
    `/family-plan/${type}/${encodeURIComponent(id)}`,
    Object.assign({ familyKey: FAMILY_KEY }, payload),
    getAuthOptions(session)
  )
}

function deletePlanItem(type, id, session) {
  return request.del(
    `/family-plan/${type}/${encodeURIComponent(id)}?familyKey=${encodeURIComponent(FAMILY_KEY)}`,
    {},
    getAuthOptions(session)
  )
}

function createGift(payload, session) {
  return request.post('/family-plan/gifts', Object.assign({ familyKey: FAMILY_KEY }, payload), getAuthOptions(session))
}

function updateGift(id, payload, session) {
  return request.put(
    `/family-plan/gifts/${encodeURIComponent(id)}`,
    Object.assign({ familyKey: FAMILY_KEY }, payload),
    getAuthOptions(session)
  )
}

function createRedemption(payload, session) {
  return request.post(
    '/family-plan/redemptions',
    Object.assign({ familyKey: FAMILY_KEY }, payload),
    getAuthOptions(session)
  )
}

function updateRedemptionStatus(id, status, session) {
  return request.put(
    `/family-plan/redemptions/${encodeURIComponent(id)}/status`,
    { familyKey: FAMILY_KEY, status },
    getAuthOptions(session)
  )
}

function createRule(payload, session) {
  return request.post('/family-plan/rules', Object.assign({ familyKey: FAMILY_KEY }, payload), getAuthOptions(session))
}

function updateRule(id, payload, session) {
  return request.put(
    `/family-plan/rules/${encodeURIComponent(id)}`,
    Object.assign({ familyKey: FAMILY_KEY }, payload),
    getAuthOptions(session)
  )
}

function deleteRule(id, session) {
  return request.del(
    `/family-plan/rules/${encodeURIComponent(id)}?familyKey=${encodeURIComponent(FAMILY_KEY)}`,
    {},
    getAuthOptions(session)
  )
}

function updateChildProfile(childId, payload, session) {
  return request.put(
    `/family-plan/children/${encodeURIComponent(childId)}`,
    Object.assign({ familyKey: FAMILY_KEY }, payload),
    getAuthOptions(session)
  )
}

module.exports = {
  FAMILY_KEY,
  loadPlan,
  loginParent,
  loginChild,
  updateCompletion,
  createPlanItem,
  updatePlanItem,
  deletePlanItem,
  createGift,
  updateGift,
  createRedemption,
  updateRedemptionStatus,
  createRule,
  updateRule,
  deleteRule,
  updateChildProfile,
}
