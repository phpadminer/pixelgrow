const assert = require('assert')
const path = require('path')

const requestPath = path.join(__dirname, '../utils/request.js')
const apiPath = path.join(__dirname, '../utils/familyPlanApi.js')

const calls = []
require.cache[require.resolve(requestPath)] = {
  exports: {
    get(url, data, options) {
      calls.push({ method: 'GET', url, data, options })
      return Promise.resolve({})
    },
    post(url, data, options) {
      calls.push({ method: 'POST', url, data, options })
      return Promise.resolve({})
    },
    put(url, data, options) {
      calls.push({ method: 'PUT', url, data, options })
      return Promise.resolve({})
    },
    del(url, data, options) {
      calls.push({ method: 'DELETE', url, data, options })
      return Promise.resolve({})
    },
  },
}

delete require.cache[require.resolve(apiPath)]
const api = require(apiPath)

async function run() {
  const session = { token: 'token-1', familyKey: 'family-a' }

  assert.strictEqual(api.FAMILY_KEY, 'guest-family')

  await api.loadPlan(null)
  assert(
    calls.pop().url.includes('familyKey=guest-family'),
    'anonymous fallback must not load the isolated audit family'
  )

  await api.loginWechat({ code: 'wx-code' })
  assert.deepStrictEqual(calls.pop(), {
    method: 'POST',
    url: '/family-plan/auth/wechat',
    data: { code: 'wx-code' },
    options: { skipAuth: true },
  })

  await api.restoreWechatSession({ code: 'restore-code' })
  assert.deepStrictEqual(calls.pop(), {
    method: 'POST',
    url: '/family-plan/auth/wechat/restore',
    data: { code: 'restore-code' },
    options: { skipAuth: true },
  })

  await api.getCurrentFamilyMembers(session)
  const membersCall = calls.pop()
  assert.strictEqual(membersCall.method, 'GET')
  assert.strictEqual(membersCall.url, '/family-plan/families/current/members')
  assert.strictEqual(membersCall.options.header.Authorization, 'Bearer token-1')

  await api.updateCurrentFamilyMember({ relation: 'father' }, session)
  const updateMemberCall = calls.pop()
  assert.strictEqual(updateMemberCall.method, 'PUT')
  assert.strictEqual(updateMemberCall.url, '/family-plan/families/current/members/me')
  assert.deepStrictEqual(updateMemberCall.data, { relation: 'father' })
  assert.strictEqual(updateMemberCall.options.header.Authorization, 'Bearer token-1')

  await api.updateFamilyMemberRole('member-1', { role: 'admin' }, session)
  const updateMemberRoleCall = calls.pop()
  assert.strictEqual(updateMemberRoleCall.method, 'PUT')
  assert.strictEqual(updateMemberRoleCall.url, '/family-plan/families/current/members/member-1/role')
  assert.deepStrictEqual(updateMemberRoleCall.data, { role: 'admin' })
  assert.strictEqual(updateMemberRoleCall.options.header.Authorization, 'Bearer token-1')

  await api.createFamily({ name: '顾家' }, session)
  const createFamilyCall = calls.pop()
  assert.strictEqual(createFamilyCall.url, '/family-plan/families')
  assert.strictEqual(createFamilyCall.options.header.Authorization, 'Bearer token-1')

  await api.joinFamilyByInvite({ inviteCode: 'AUDIT2026' }, session)
  assert.strictEqual(calls.pop().url, '/family-plan/invites/join')

  await api.switchFamily('family-b', session)
  const switchCall = calls.pop()
  assert.strictEqual(switchCall.url, '/family-plan/families/family-b/switch')
  assert.strictEqual(switchCall.options.header.Authorization, 'Bearer token-1')

  await api.updateFamily('family-b', { name: '新家庭' }, session)
  const updateFamilyCall = calls.pop()
  assert.strictEqual(updateFamilyCall.method, 'PUT')
  assert.strictEqual(updateFamilyCall.url, '/family-plan/families/family-b')
  assert.deepStrictEqual(updateFamilyCall.data, { name: '新家庭' })
  assert.strictEqual(updateFamilyCall.options.header.Authorization, 'Bearer token-1')

  await api.deleteFamily('family-b', session)
  const deleteFamilyCall = calls.pop()
  assert.strictEqual(deleteFamilyCall.method, 'DELETE')
  assert.strictEqual(deleteFamilyCall.url, '/family-plan/families/family-b')
  assert.strictEqual(deleteFamilyCall.options.header.Authorization, 'Bearer token-1')

  await api.createPlanItem('tasks', { title: '任务' }, session)
  assert.strictEqual(calls.pop().data.familyKey, 'family-a')

  await api.createChildProfile({ name: '我的孩子', avatar: 'lamb', grade: '一年级' }, session)
  assert.deepStrictEqual(calls.pop(), {
    method: 'POST',
    url: '/family-plan/children',
    data: { familyKey: 'family-a', name: '我的孩子', avatar: 'lamb', grade: '一年级' },
    options: { header: { Authorization: 'Bearer token-1' }, skipAuth: true },
  })

  await api.deleteGift('gift-1', session)
  assert.deepStrictEqual(calls.pop(), {
    method: 'DELETE',
    url: '/family-plan/gifts/gift-1?familyKey=family-a',
    data: {},
    options: { header: { Authorization: 'Bearer token-1' }, skipAuth: true },
  })
}

run().then(() => console.log('familyPlanAccountApi tests passed'))
