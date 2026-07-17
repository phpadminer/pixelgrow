const assert = require('assert')
const fs = require('fs')
const path = require('path')

const rootDir = path.resolve(__dirname, '../../..')

function read(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), 'utf8')
}

function testMiniProgramReminderEntry() {
  const wxml = read('client/miniprogram/pages/family-plan/index.wxml')
  const page = read('client/miniprogram/pages/family-plan/index.js')
  const api = read('client/miniprogram/utils/familyPlanApi.js')

  assert.ok(wxml.includes('微信提醒'), '通知页应该展示微信提醒入口')
  assert.ok(wxml.includes('bindtap="subscribeDailyReminder"'), '应该支持授权每日提醒')
  assert.ok(wxml.includes('bindtap="subscribeDeadlineReminder"'), '应该支持授权到期提醒')
  assert.ok(wxml.includes('bindtap="sendReminderTest"'), '应该支持测试发送提醒')

  assert.ok(page.includes('wx.requestSubscribeMessage'), '前端应调用微信订阅消息授权')
  assert.ok(page.includes('api.getReminderConfig'), '前端应读取后端模板配置')
  assert.ok(page.includes('api.saveReminderSubscription'), '前端应保存订阅结果')
  assert.ok(page.includes('api.sendReminderTest'), '前端应触发测试发送')

  assert.ok(api.includes('/family-plan/reminders/config'), 'API 应有提醒配置接口')
  assert.ok(api.includes('/family-plan/reminders/subscriptions'), 'API 应有订阅保存接口')
  assert.ok(api.includes('/family-plan/reminders/send-test'), 'API 应有测试发送接口')
}

function testServerReminderContract() {
  const schema = read('server/prisma/schema.prisma')
  const dto = read('server/src/modules/family-plan/family-plan.dto.ts')
  const controller = read('server/src/modules/family-plan/family-plan.controller.ts')
  const service = read('server/src/modules/family-plan/family-plan.service.ts')

  assert.ok(schema.includes('model FamilyPlanReminderSubscription'), 'Prisma 应有提醒订阅表')
  assert.ok(dto.includes('SaveFamilyPlanReminderSubscriptionDto'), 'DTO 应有订阅保存入参')
  assert.ok(dto.includes('SendFamilyPlanReminderTestDto'), 'DTO 应有测试发送入参')
  assert.ok(controller.includes("@Get('reminders/config')"), 'Controller 应暴露提醒配置接口')
  assert.ok(controller.includes("@Post('reminders/subscriptions')"), 'Controller 应暴露订阅保存接口')
  assert.ok(controller.includes("@Post('reminders/send-test')"), 'Controller 应暴露测试发送接口')
  assert.ok(controller.includes("@Post('reminders/send-due')"), 'Controller 应暴露定时任务触发接口')
  assert.ok(service.includes('sendWechatSubscribeMessage'), 'Service 应封装微信订阅消息发送')
  assert.ok(service.includes('sendDueReminders'), 'Service 应支持外部 cron 触发提醒')
}

testMiniProgramReminderEntry()
testServerReminderContract()

console.log('familyPlanWechatReminders tests passed')
