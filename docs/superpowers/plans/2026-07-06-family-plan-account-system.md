# Family Plan Account System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a WeChat-linked account system where one account can create, join, invite, and switch family-plan families without losing existing family-plan data.

**Architecture:** Add family-plan-specific account, family, membership, and invite tables. Keep current `familyKey` as the compatibility key used by existing course/task/gift/completion tables, so current data remains readable during migration. Add small mini program entry points for WeChat login, family creation, invite-code join, and family switch while keeping guest browsing and old demo child login intact.

**Tech Stack:** WeChat Mini Program JavaScript/WXML/WXSS, NestJS 11, Prisma 6, MySQL, existing HMAC family-plan session token.

---

## File Structure

- Modify `server/prisma/schema.prisma`: add `FamilyPlanAccount`, `FamilyPlanFamily`, `FamilyPlanFamilyMember`, and `FamilyPlanInvite`.
- Modify `server/src/modules/family-plan/family-plan.dto.ts`: add DTOs for WeChat login, family creation, invite creation, invite join, and family switch.
- Modify `server/src/modules/family-plan/family-plan.controller.ts`: expose account/family/invite endpoints.
- Modify `server/src/modules/family-plan/family-plan.service.ts`: implement WeChat code exchange, account upsert, family list, create, invite, join, switch, and session signing.
- Modify `client/miniprogram/utils/familyPlanApi.js`: add account APIs and make write payloads use the active family key.
- Modify `client/miniprogram/pages/family-plan/index.js`: add account state, WeChat login, create family, join by invite, family switch, and active family persistence.
- Modify `client/miniprogram/pages/family-plan/index.wxml`: add compact family entry/switch UI and keep login modal explicit.
- Modify `client/miniprogram/pages/family-plan/index.wxss`: add warm-yellow styles for the new compact account/family controls.
- Add `client/miniprogram/tests/familyPlanAccountApi.test.js`: verify mini program API wrapper behavior.
- Add `client/miniprogram/tests/familyPlanAccountWxml.test.js`: verify review-safe login and family UI markup.
- Add `server/tests/family-plan-account-schema.test.js`: verify Prisma schema has the required compatibility models and constraints.

## Tasks

### Task 1: Add Failing Account Tests

**Files:**
- Create: `client/miniprogram/tests/familyPlanAccountApi.test.js`
- Create: `client/miniprogram/tests/familyPlanAccountWxml.test.js`
- Create: `server/tests/family-plan-account-schema.test.js`

- [ ] **Step 1: Write API wrapper test**

```js
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

  await api.loginWechat({ code: 'wx-code' })
  assert.deepStrictEqual(calls.pop(), {
    method: 'POST',
    url: '/family-plan/auth/wechat',
    data: { code: 'wx-code' },
    options: { skipAuth: true },
  })

  await api.createFamily({ name: '顾家' }, session)
  assert.strictEqual(calls.pop().url, '/family-plan/families')

  await api.joinFamilyByInvite({ inviteCode: 'AUDIT2026' }, session)
  assert.strictEqual(calls.pop().url, '/family-plan/invites/join')

  await api.switchFamily('family-b', session)
  const switchCall = calls.pop()
  assert.strictEqual(switchCall.url, '/family-plan/families/family-b/switch')
  assert.strictEqual(switchCall.options.header.Authorization, 'Bearer token-1')

  await api.createPlanItem('tasks', { title: '任务' }, session)
  assert.strictEqual(calls.pop().data.familyKey, 'family-a')
}

run().then(() => console.log('familyPlanAccountApi tests passed'))
```

- [ ] **Step 2: Write WXML/schema tests**

```js
const assert = require('assert')
const fs = require('fs')
const path = require('path')

const wxml = fs.readFileSync(path.join(__dirname, '../pages/family-plan/index.wxml'), 'utf8')

assert(wxml.includes('bindtap="loginWithWechat"'), 'parent account login should use explicit WeChat login action')
assert(wxml.includes('bindtap="openFamilySwitcher"'), 'logged-in parent should be able to switch families')
assert(wxml.includes('bindtap="openJoinFamilyForm"'), 'logged-in parent should be able to join by invite code')
assert(wxml.includes('bindtap="openCreateFamilyForm"'), 'logged-in parent should be able to create a family')
assert(wxml.includes('inviteCode'), 'join form should expose inviteCode input')
assert(!wxml.includes('button open-type="getPhoneNumber"'), 'family-plan login must not require phone authorization')

console.log('familyPlanAccountWxml tests passed')
```

```js
const assert = require('assert')
const fs = require('fs')
const path = require('path')

const schema = fs.readFileSync(path.join(__dirname, '../prisma/schema.prisma'), 'utf8')

assert(schema.includes('model FamilyPlanAccount'), 'schema should define FamilyPlanAccount')
assert(schema.includes('wechatOpenId String   @unique'), 'account should keep unique WeChat openid')
assert(schema.includes('model FamilyPlanFamily'), 'schema should define FamilyPlanFamily')
assert(schema.includes('familyKey String   @unique'), 'family should keep unique compatibility familyKey')
assert(schema.includes('model FamilyPlanFamilyMember'), 'schema should define FamilyPlanFamilyMember')
assert(schema.includes('@@unique([familyId, accountId])'), 'membership should prevent duplicate family joins')
assert(schema.includes('model FamilyPlanInvite'), 'schema should define FamilyPlanInvite')
assert(schema.includes('inviteCode String   @unique'), 'invite code should be unique')

console.log('family-plan account schema tests passed')
```

- [ ] **Step 3: Run tests and verify they fail**

Run:

```bash
node client/miniprogram/tests/familyPlanAccountApi.test.js
node client/miniprogram/tests/familyPlanAccountWxml.test.js
node server/tests/family-plan-account-schema.test.js
```

Expected: FAIL because account APIs, UI bindings, and Prisma models do not exist yet.

### Task 2: Add Server Account Model and Endpoints

**Files:**
- Modify: `server/prisma/schema.prisma`
- Modify: `server/src/modules/family-plan/family-plan.dto.ts`
- Modify: `server/src/modules/family-plan/family-plan.controller.ts`
- Modify: `server/src/modules/family-plan/family-plan.service.ts`

- [ ] **Step 1: Add Prisma models**

Add account, family, member, and invite models. Keep `familyKey` unique and never replace existing plan tables in this MVP.

- [ ] **Step 2: Add DTOs and routes**

Add routes:

```text
POST /family-plan/auth/wechat
GET  /family-plan/families
POST /family-plan/families
POST /family-plan/families/:id/switch
POST /family-plan/invites
POST /family-plan/invites/join
```

- [ ] **Step 3: Implement service behavior**

Behavior:

- WeChat login exchanges code for `openid`; without app credentials, dev fallback is `dev_openid_${code}`.
- Login finds or creates `FamilyPlanAccount`.
- If the account has no family, login returns no active family and no forced creation.
- `createFamily` creates a new `familyKey` and `owner` membership, then returns a parent session for that family.
- `joinFamilyByInvite` validates invite status and expiry, adds `parent` membership, and returns a parent session.
- `switchFamily` verifies membership and returns a parent session for the chosen family.
- Existing `loginParent` and `loginChild` keep working for audit/demo fallback.

- [ ] **Step 4: Run tests**

Run:

```bash
node server/tests/family-plan-account-schema.test.js
cd server && npm run db:generate && npm run build
```

Expected: PASS.

### Task 3: Add Mini Program Account/Family UI

**Files:**
- Modify: `client/miniprogram/utils/familyPlanApi.js`
- Modify: `client/miniprogram/pages/family-plan/index.js`
- Modify: `client/miniprogram/pages/family-plan/index.wxml`
- Modify: `client/miniprogram/pages/family-plan/index.wxss`

- [ ] **Step 1: Add API wrapper methods**

Add `loginWechat`, `listFamilies`, `createFamily`, `createInvite`, `joinFamilyByInvite`, and `switchFamily`.

- [ ] **Step 2: Add parent account state**

Add page data for `account`, `families`, `activeFamily`, `familySwitcherOpen`, `createFamilyFormOpen`, `joinFamilyFormOpen`, `familyName`, and `inviteCode`.

- [ ] **Step 3: Add UI actions**

Implement:

- `loginWithWechat`
- `loadFamilies`
- `openFamilySwitcher` / `closeFamilySwitcher`
- `openCreateFamilyForm` / `closeCreateFamilyForm` / `submitCreateFamily`
- `openJoinFamilyForm` / `closeJoinFamilyForm` / `submitJoinFamily`
- `switchFamily`

- [ ] **Step 4: Keep review-safe browsing**

Guest users still see the plan without forced login. Parent WeChat login only starts after tapping the login button.

- [ ] **Step 5: Run tests**

Run:

```bash
node client/miniprogram/tests/familyPlanAccountApi.test.js
node client/miniprogram/tests/familyPlanAccountWxml.test.js
node client/miniprogram/tests/familyPlanWxml.test.js
node -c client/miniprogram/pages/family-plan/index.js
```

Expected: PASS.

### Task 4: Full Verification and Commit

**Files:**
- All touched files.

- [ ] **Step 1: Run full mini program tests**

Run:

```bash
for f in client/miniprogram/tests/*.test.js; do node "$f"; done
```

Expected: all tests pass.

- [ ] **Step 2: Run server verification**

Run:

```bash
cd server && npm run db:generate && npm run build
```

Expected: Prisma Client generated and Nest build succeeds.

- [ ] **Step 3: Commit**

Run:

```bash
git add server/prisma/schema.prisma server/src/modules/family-plan client/miniprogram/utils/familyPlanApi.js client/miniprogram/pages/family-plan client/miniprogram/tests server/tests docs/superpowers/plans/2026-07-06-family-plan-account-system.md
git commit -m "feat: add family plan account system"
```

Expected: commit created with only related files.

---

## Self-Review

- Spec coverage: WeChat account binding, create family, join family, invite, switch family, audit invite path, and existing data preservation are covered.
- Data preservation: Existing family-plan data tables stay keyed by `familyKey`; new `FamilyPlanFamily.familyKey` bridges to those tables.
- Review safety: No forced first-screen login and no phone authorization are introduced.
- Scope limit: Child WeChat binding is intentionally deferred; child login remains `childCode + PIN`.
