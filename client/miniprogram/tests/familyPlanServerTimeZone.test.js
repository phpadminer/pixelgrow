const assert = require('assert')
const fs = require('fs')
const path = require('path')

const serviceTs = fs.readFileSync(path.join(__dirname, '../../../server/src/modules/family-plan/family-plan.service.ts'), 'utf8')

assert(
  serviceTs.includes("const APP_TIME_ZONE = process.env.FAMILY_PLAN_TIME_ZONE || 'Asia/Shanghai'"),
  'server should use a fixed business timezone for lesson start checks instead of container local time'
)

assert(
  /function getZonedDateParts\(value = new Date\(\), timeZone = APP_TIME_ZONE\)[\s\S]*?Intl\.DateTimeFormat[\s\S]*?timeZone/.test(serviceTs),
  'server should derive date and clock parts through Intl.DateTimeFormat with the business timezone'
)

assert(
  /function isBeforeStartTime\(date: string, time\?: string \| null, now = new Date\(\)\)[\s\S]*?const current = getZonedDateParts\(now\)[\s\S]*?current\.hour \* 60 \+ current\.minute < startMinutes/.test(serviceTs)
    && !/function isBeforeStartTime[\s\S]*?now\.getHours\(\)/.test(serviceTs),
  'server should compare lesson start time with business-timezone hour and minute, not UTC container hour'
)

console.log('familyPlanServerTimeZone tests passed')
