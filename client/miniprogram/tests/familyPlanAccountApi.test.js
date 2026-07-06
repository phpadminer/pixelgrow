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

  assert.strictEqual(api.FAMILY_KEY, 'audit-family')

  await api.loadPlan(null)
  assert(
    calls.pop().url.includes('familyKey=audit-family'),
    'guest experience should load the isolated audit family'
  )

  await api.loginWechat({ code: 'wx-code' })
  assert.deepStrictEqual(calls.pop(), {
    method: 'POST',
    url: '/family-plan/auth/wechat',
    data: { code: 'wx-code' },
    options: { skipAuth: true },
  })

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

  await api.createPlanItem('tasks', { title: '任务' }, session)
  assert.strictEqual(calls.pop().data.familyKey, 'family-a')

  await api.deleteGift('gift-1', session)
  assert.deepStrictEqual(calls.pop(), {
    method: 'DELETE',
    url: '/family-plan/gifts/gift-1?familyKey=family-a',
    data: {},
    options: { header: { Authorization: 'Bearer token-1' }, skipAuth: true },
  })
}

run().then(() => console.log('familyPlanAccountApi tests passed'))
