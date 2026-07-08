const request = require('./request')

const FAMILY_KEY = 'guest-family'

function getAuthOptions(session) {
  return session && session.token
    ? { header: { Authorization: `Bearer ${session.token}` }, skipAuth: true }
    : { skipAuth: true }
}

function getSessionFamilyKey(session) {
  return session && session.familyKey ? session.familyKey : FAMILY_KEY
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

function loginWechat(payload) {
  return request.post('/family-plan/auth/wechat', payload, { skipAuth: true })
}

function restoreWechatSession(payload) {
  return request.post('/family-plan/auth/wechat/restore', payload, { skipAuth: true })
}

function listFamilies(session) {
  return request.get('/family-plan/families', {}, getAuthOptions(session))
}

function getCurrentFamilyMembers(session) {
  return request.get('/family-plan/families/current/members', {}, getAuthOptions(session))
}

function updateCurrentFamilyMember(payload, session) {
  return request.put('/family-plan/families/current/members/me', payload, getAuthOptions(session))
}

function createFamily(payload, session) {
  return request.post('/family-plan/families', payload, getAuthOptions(session))
}

function createInvite(payload, session) {
  return request.post('/family-plan/invites', payload, getAuthOptions(session))
}

function joinFamilyByInvite(payload, session) {
  return request.post('/family-plan/invites/join', payload, getAuthOptions(session))
}

function switchFamily(familyId, session) {
  return request.post(`/family-plan/families/${encodeURIComponent(familyId)}/switch`, {}, getAuthOptions(session))
}

function updateFamily(familyId, payload, session) {
  return request.put(`/family-plan/families/${encodeURIComponent(familyId)}`, payload, getAuthOptions(session))
}

function deleteFamily(familyId, session) {
  return request.del(`/family-plan/families/${encodeURIComponent(familyId)}`, {}, getAuthOptions(session))
}

function updateCompletion(itemKey, completed, session, options = {}) {
  return request.put(
    `/family-plan/completions/${encodeURIComponent(itemKey)}`,
    { familyKey: getSessionFamilyKey(session), completed, isMakeup: Boolean(options.isMakeup) },
    getAuthOptions(session)
  )
}

function createPlanItem(type, payload, session) {
  return request.post(
    `/family-plan/${type}`,
    Object.assign({ familyKey: getSessionFamilyKey(session) }, payload),
    getAuthOptions(session)
  )
}

function createChildProfile(payload, session) {
  return request.post(
    '/family-plan/children',
    Object.assign({ familyKey: getSessionFamilyKey(session) }, payload),
    getAuthOptions(session)
  )
}

function updatePlanItem(type, id, payload, session) {
  return request.put(
    `/family-plan/${type}/${encodeURIComponent(id)}`,
    Object.assign({ familyKey: getSessionFamilyKey(session) }, payload),
    getAuthOptions(session)
  )
}

function deletePlanItem(type, id, session) {
  const familyKey = getSessionFamilyKey(session)
  return request.del(
    `/family-plan/${type}/${encodeURIComponent(id)}?familyKey=${encodeURIComponent(familyKey)}`,
    {},
    getAuthOptions(session)
  )
}

function createGift(payload, session) {
  return request.post('/family-plan/gifts', Object.assign({ familyKey: getSessionFamilyKey(session) }, payload), getAuthOptions(session))
}

function updateGift(id, payload, session) {
  return request.put(
    `/family-plan/gifts/${encodeURIComponent(id)}`,
    Object.assign({ familyKey: getSessionFamilyKey(session) }, payload),
    getAuthOptions(session)
  )
}

function deleteGift(id, session) {
  const familyKey = getSessionFamilyKey(session)
  return request.del(
    `/family-plan/gifts/${encodeURIComponent(id)}?familyKey=${encodeURIComponent(familyKey)}`,
    {},
    getAuthOptions(session)
  )
}

function createRedemption(payload, session) {
  return request.post(
    '/family-plan/redemptions',
    Object.assign({ familyKey: getSessionFamilyKey(session) }, payload),
    getAuthOptions(session)
  )
}

function updateRedemptionStatus(id, status, session) {
  return request.put(
    `/family-plan/redemptions/${encodeURIComponent(id)}/status`,
    { familyKey: getSessionFamilyKey(session), status },
    getAuthOptions(session)
  )
}

function createRule(payload, session) {
  return request.post('/family-plan/rules', Object.assign({ familyKey: getSessionFamilyKey(session) }, payload), getAuthOptions(session))
}

function updateRule(id, payload, session) {
  return request.put(
    `/family-plan/rules/${encodeURIComponent(id)}`,
    Object.assign({ familyKey: getSessionFamilyKey(session) }, payload),
    getAuthOptions(session)
  )
}

function deleteRule(id, session) {
  const familyKey = getSessionFamilyKey(session)
  return request.del(
    `/family-plan/rules/${encodeURIComponent(id)}?familyKey=${encodeURIComponent(familyKey)}`,
    {},
    getAuthOptions(session)
  )
}

function updateChildProfile(childId, payload, session) {
  return request.put(
    `/family-plan/children/${encodeURIComponent(childId)}`,
    Object.assign({ familyKey: getSessionFamilyKey(session) }, payload),
    getAuthOptions(session)
  )
}

module.exports = {
  FAMILY_KEY,
  loadPlan,
  loginParent,
  loginChild,
  loginWechat,
  restoreWechatSession,
  listFamilies,
  getCurrentFamilyMembers,
  updateCurrentFamilyMember,
  createFamily,
  createInvite,
  joinFamilyByInvite,
  switchFamily,
  updateFamily,
  deleteFamily,
  updateCompletion,
  createPlanItem,
  createChildProfile,
  updatePlanItem,
  deletePlanItem,
  createGift,
  updateGift,
  deleteGift,
  createRedemption,
  updateRedemptionStatus,
  createRule,
  updateRule,
  deleteRule,
  updateChildProfile,
}
