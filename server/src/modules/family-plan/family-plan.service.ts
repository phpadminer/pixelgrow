import { createHmac, timingSafeEqual } from 'node:crypto'
import { BadRequestException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import {
  ChildLoginDto,
  CreateFamilyPlanFamilyDto,
  CreateFamilyPlanCourseDto,
  CreateFamilyPlanGiftDto,
  CreateFamilyPlanHabitDto,
  CreateFamilyPlanInviteDto,
  CreateFamilyPlanMilestoneDto,
  CreateFamilyPlanRedemptionDto,
  CreateFamilyPlanRuleDto,
  CreateFamilyPlanTaskDto,
  JoinFamilyPlanInviteDto,
  ParentLoginDto,
  UpdateFamilyPlanChildDto,
  UpdateFamilyPlanCourseDto,
  UpdateFamilyPlanGiftDto,
  UpdateFamilyPlanHabitDto,
  UpdateFamilyPlanMilestoneDto,
  UpdateFamilyPlanRedemptionStatusDto,
  UpdateFamilyPlanRuleDto,
  UpdateFamilyPlanTaskDto,
  WechatFamilyPlanLoginDto,
} from './family-plan.dto'

const DEFAULT_FAMILY_KEY = 'demo-family'
const AUDIT_FAMILY_KEY = 'audit-family'
const AUDIT_INVITE_CODE = process.env.FAMILY_PLAN_AUDIT_INVITE_CODE || 'AUDIT2026'
const PARENT_DEMO_CODE = '123456'
const TOKEN_SECRET = process.env.FAMILY_PLAN_TOKEN_SECRET || 'family-plan-dev-secret'
const SEED_MODES = ['demo', 'starter', 'off'] as const
const MAX_INLINE_GIFT_IMAGE_LENGTH = 200000
const FAMILY_MEMBER_ROLES = ['owner', 'admin', 'parent', 'viewer'] as const

type FamilyPlanSeedMode = typeof SEED_MODES[number]
type FamilyPlanMemberRole = typeof FAMILY_MEMBER_ROLES[number]

function getSeedMode(): FamilyPlanSeedMode {
  const configuredMode = process.env.FAMILY_PLAN_SEED_MODE
  if (SEED_MODES.includes(configuredMode as FamilyPlanSeedMode)) {
    return configuredMode as FamilyPlanSeedMode
  }
  return process.env.NODE_ENV === 'production' ? 'starter' : 'demo'
}

function isInlineImageUrl(imageUrl?: string | null) {
  return Boolean(imageUrl && imageUrl.startsWith('data:image/'))
}

function normalizeGiftImageUrl(imageUrl?: string | null) {
  if (!imageUrl) return ''
  if (isInlineImageUrl(imageUrl) && imageUrl.length > MAX_INLINE_GIFT_IMAGE_LENGTH) {
    return ''
  }
  return imageUrl
}

function assertGiftImageUrl(imageUrl: string) {
  if (isInlineImageUrl(imageUrl) && imageUrl.length > MAX_INLINE_GIFT_IMAGE_LENGTH) {
    throw new BadRequestException('礼品图片太大，请先压缩到 200K 以内')
  }
}

function normalizeGiftTitle(title: string) {
  const value = title.trim()
  if (!value) {
    throw new BadRequestException('礼品名称必填')
  }
  return value
}

const defaultChildren = [
  { childKey: 'gege', childCode: 'GEGE01', pinCode: '2580', name: '哥哥', avatar: 'lamb', grade: '四年级' },
  { childKey: 'meimei', childCode: 'MEIMEI01', pinCode: '2580', name: '妹妹', avatar: 'chick', grade: '二年级' },
]

const defaultCourses = [
  {
    id: 'math',
    childKey: 'gege',
    subject: '数学补课',
    teacher: '李老师',
    startDate: '2026-07-01',
    settlementDate: '2026-08-31',
    weekday: 1,
    time: '18:30',
    durationMinutes: 90,
  },
  {
    id: 'english',
    childKey: 'gege',
    subject: '英语口语课',
    teacher: 'Anna',
    startDate: '2026-07-01',
    settlementDate: '2026-08-31',
    weekday: 3,
    time: '20:20',
    durationMinutes: 60,
  },
  {
    id: 'painting',
    childKey: 'meimei',
    subject: '创意绘画',
    teacher: '小胡老师',
    startDate: '2026-07-01',
    settlementDate: '2026-08-31',
    weekday: 6,
    time: '10:00',
    durationMinutes: 75,
  },
]

const defaultHabits = [
  { id: 'reading', childKey: 'gege', title: '阅读 30 分钟', frequency: 'daily', meta: '每日习惯' },
  { id: 'desk', childKey: 'gege', title: '整理书桌', frequency: 'daily', meta: '每日习惯' },
  { id: 'instrument', childKey: 'gege', title: '圆号练习 20 分钟', frequency: 'daily', meta: '艺术习惯' },
  { id: 'drawing', childKey: 'meimei', title: '自由画一页', frequency: 'daily', meta: '创造习惯' },
]

const defaultTasks = [
  { id: 'oral', childKey: 'gege', title: '英语口语录音', dueDate: '2026-07-06', time: '20:20', meta: '任务' },
  { id: 'packing', childKey: 'gege', title: '整理补课资料袋', dueDate: '2026-07-06', time: '17:40', meta: '任务' },
  { id: 'artbox', childKey: 'meimei', title: '收拾画具盒', dueDate: '2026-07-06', time: '19:30', meta: '任务' },
]

const defaultMilestones = [
  { id: 'final-exam', title: '期末考试', date: '2026-08-13' },
  { id: 'tuition-close', title: '补课结算', date: '2026-07-31' },
]

const defaultCompletions = [
  { itemKey: 'habit-reading-2026-07-06', completed: true },
  { itemKey: 'habit-desk-2026-07-06', completed: true },
  { itemKey: 'course-painting-2026-07-04', completed: true },
  { itemKey: 'habit-drawing-2026-07-06', completed: true },
]

const defaultRules = [
  {
    title: '共同完成规则',
    body: '课程和任务当天完成；习惯允许当天 22:00 前补打卡。失败默认不扣分，先补做或复盘。',
  },
  {
    title: '共同奖励规则',
    body: '积分只奖励具体行为，不奖励“乖不乖”。每日完成率达到 80% 可记星，连续 5 天可兑换家庭奖励。',
  },
  {
    childKey: 'gege',
    title: '哥哥独立规则',
    body: '四年级任务增加自我复盘：未完成时自己说出原因，并重新安排补做时间。',
  },
  {
    childKey: 'meimei',
    title: '妹妹独立规则',
    body: '二年级任务保持即时反馈：完成后立即表扬，未完成时拆成更小一步。',
  },
]

const defaultGifts = [
  {
    title: '周末家庭电影',
    description: '孩子选择一部电影，全家一起看。',
    imageUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=480&q=80',
    pointsCost: 8,
    stock: 6,
    active: true,
  },
  {
    title: '乐高小车套装',
    description: '适合完成一个阶段目标后兑换。',
    imageUrl: 'https://images.unsplash.com/photo-1587654780291-39c9404d746b?auto=format&fit=crop&w=480&q=80',
    pointsCost: 30,
    stock: 2,
    active: true,
  },
  {
    title: '亲子运动半日',
    description: '公园、骑行、游泳三选一。',
    imageUrl: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=480&q=80',
    pointsCost: 18,
    stock: 4,
    active: true,
  },
]

type FamilyPlanSession = {
  role: 'parent' | 'child'
  familyKey?: string
  familyId?: string
  accountId?: string
  familyName?: string
  memberRole?: FamilyPlanMemberRole
  childId?: string
  name?: string
  exp: number
}

function base64Url(input: string) {
  return Buffer.from(input).toString('base64url')
}

function signPayload(payload: string) {
  return createHmac('sha256', TOKEN_SECRET).update(payload).digest('base64url')
}

function signSession(session: Omit<FamilyPlanSession, 'exp'>) {
  const payload = base64Url(JSON.stringify({
    ...session,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30,
  }))
  return `${payload}.${signPayload(payload)}`
}

function getBearerToken(authorization?: string) {
  const match = authorization?.match(/^Bearer\s+(.+)$/i)
  return match?.[1]
}

function verifySession(authorization?: string): FamilyPlanSession | undefined {
  const token = getBearerToken(authorization)
  if (!token) return undefined

  const [payload, signature] = token.split('.')
  if (!payload || !signature) {
    throw new UnauthorizedException('登录已失效')
  }

  const expected = signPayload(payload)
  const providedBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expected)
  if (providedBuffer.length !== expectedBuffer.length || !timingSafeEqual(providedBuffer, expectedBuffer)) {
    throw new UnauthorizedException('登录已失效')
  }

  const session = JSON.parse(Buffer.from(payload, 'base64url').toString()) as FamilyPlanSession
  if (!session.exp || session.exp < Math.floor(Date.now() / 1000)) {
    throw new UnauthorizedException('登录已过期')
  }
  return session
}

function getAgeBandFromGrade(grade = '') {
  if (['一年级', '二年级', '三年级'].includes(grade)) return 'lower_primary'
  if (['初一', '初二', '初三', '高一', '高二', '高三'].includes(grade)) return 'teen'
  return 'upper_primary'
}

function clampInteger(value: number | undefined, min: number, max: number, fallback: number) {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback
  return Math.min(max, Math.max(min, Math.round(value)))
}

function defaultReward(category: 'course' | 'habit' | 'task', grade = '') {
  const ageBand = getAgeBandFromGrade(grade)
  const pointsByAge = {
    lower_primary: { habit: 2, course: 3, task: 2 },
    upper_primary: { habit: 2, course: 4, task: 3 },
    teen: { habit: 1, course: 3, task: 3 },
  }
  const failureRules = {
    lower_primary: {
      habit: '不扣分，提醒补做一次',
      course: '不扣分，家长陪同复盘 3 分钟',
      task: '不扣分，拆小一步后补做',
    },
    upper_primary: {
      habit: '不扣分，自己说出原因并补做',
      course: '不扣分，记录原因并安排补做',
      task: '不扣分，记录原因并安排补做',
    },
    teen: {
      habit: '不扣分，自己复盘并重排时间',
      course: '不扣分，复盘投入和完成质量',
      task: '不扣分，复盘原因并重新承诺时间',
    },
  }
  const successPoints = pointsByAge[ageBand][category]
  const successRule = category === 'course'
    ? `确认完成质量 + ${successPoints} 积分`
    : category === 'habit'
      ? `立即表扬 + ${successPoints} 积分`
      : `按要求完成 + ${successPoints} 积分`

  return {
    successPoints,
    failurePoints: 0,
    allowMakeup: true,
    makeupPoints: Math.max(0, successPoints - 1),
    successRule,
    makeupRule: `补卡完成 + ${Math.max(0, successPoints - 1)} 积分`,
    failureRule: failureRules[ageBand][category],
  }
}

function focusData(dto: { focusMode?: string; focusMinutes?: number; breakMinutes?: number }) {
  const focusMode = dto.focusMode === 'custom' ? 'custom' : 'pomodoro'
  return {
    focusMode,
    focusMinutes: dto.focusMinutes || 25,
    breakMinutes: dto.breakMinutes ?? 5,
  }
}

function rewardData(
  dto: {
    successPoints?: number
    failurePoints?: number
    allowMakeup?: boolean
    makeupPoints?: number
    successRule?: string
    makeupRule?: string
    failureRule?: string
  },
  fallback: ReturnType<typeof defaultReward>,
) {
  const successPoints = clampInteger(dto.successPoints, 0, 20, fallback.successPoints)
  const makeupPoints = clampInteger(dto.makeupPoints, 0, 20, fallback.makeupPoints)
  return {
    successPoints,
    failurePoints: clampInteger(dto.failurePoints, 0, 20, fallback.failurePoints),
    allowMakeup: dto.allowMakeup !== false,
    makeupPoints,
    successRule: dto.successRule?.trim() || fallback.successRule,
    makeupRule: dto.makeupRule?.trim() || `补卡完成 + ${makeupPoints} 积分`,
    failureRule: dto.failureRule?.trim() || fallback.failureRule,
  }
}

function localDateString(value = new Date()) {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function timeToMinutes(time?: string | null) {
  const match = String(time || '').match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return null
  const hour = Number(match[1])
  const minute = Number(match[2])
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null
  return hour * 60 + minute
}

function isBeforeStartTime(date: string, time?: string | null, now = new Date()) {
  const today = localDateString(now)
  if (date > today) return true
  if (date < today) return false
  const startMinutes = timeToMinutes(time)
  if (startMinutes === null) return false
  return now.getHours() * 60 + now.getMinutes() < startMinutes
}

function getWeekdayFromDate(date: string) {
  return new Date(`${date}T00:00:00`).getDay()
}

function getScheduleTimeForDate(schedules: any, date: string, fallback?: string | null) {
  if (!Array.isArray(schedules) || schedules.length === 0) return fallback
  const weekday = getWeekdayFromDate(date)
  const schedule = schedules.find((item) => Number(item.weekday) === weekday) || schedules[0]
  return schedule?.time || fallback
}

function normalizeCourseLessonType(value: unknown): 'trial' | 'formal' | 'bonus' {
  return value === 'trial' || value === 'bonus' || value === 'formal' ? value : 'formal'
}

function isDateString(value: unknown) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function isTimeString(value: unknown) {
  return typeof value === 'string' && /^([01]?\d|2[0-3]):[0-5]\d$/.test(value)
}

function normalizeCourseSchedules(value: unknown, fallbackWeekday: number, fallbackTime: string) {
  const source = Array.isArray(value) && value.length > 0 ? value : [{ weekday: fallbackWeekday, time: fallbackTime }]
  const seen = new Set<string>()
  return source
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const schedule = item as { weekday?: unknown; time?: unknown; lessonType?: unknown }
      const weekday = Number(schedule.weekday)
      if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) return null
      const time = isTimeString(schedule.time) ? String(schedule.time) : fallbackTime
      const lessonType = normalizeCourseLessonType(schedule.lessonType)
      const key = `${weekday}-${time}-${lessonType}`
      if (seen.has(key)) return null
      seen.add(key)
      return { weekday, time, lessonType }
    })
    .filter((item): item is { weekday: number; time: string; lessonType: 'trial' | 'formal' | 'bonus' } => Boolean(item))
}

function normalizeCourseExtraSessions(value: unknown) {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const session = item as { date?: unknown; sessionDate?: unknown; time?: unknown; lessonType?: unknown }
      const date = isDateString(session.date) ? session.date : isDateString(session.sessionDate) ? session.sessionDate : ''
      if (!date) return null
      const time = isTimeString(session.time) ? String(session.time) : ''
      const lessonType = normalizeCourseLessonType(session.lessonType)
      const key = `${date}-${time}-${lessonType}`
      if (seen.has(key)) return null
      seen.add(key)
      return { date, time, lessonType }
    })
    .filter((item): item is { date: string; time: string; lessonType: 'trial' | 'formal' | 'bonus' } => Boolean(item))
}

function getExtraSessionForDate(extraSessions: unknown, date: string) {
  return normalizeCourseExtraSessions(extraSessions).find((item) => item.date === date)
}

function getCourseTimeForDate(course: { schedules?: unknown; extraSessions?: unknown; time?: string | null }, date: string) {
  const extraSession = getExtraSessionForDate(course.extraSessions, date)
  return extraSession?.time || getScheduleTimeForDate(course.schedules, date, course.time)
}

function normalizeFamilyName(name?: string) {
  const value = name?.trim() || ''
  if (!value) {
    throw new BadRequestException('家庭名称必填')
  }
  return value.slice(0, 40)
}

function normalizeInviteCode(inviteCode?: string) {
  const value = inviteCode?.trim().toUpperCase() || ''
  if (!value) {
    throw new BadRequestException('邀请码必填')
  }
  return value
}

function normalizeMemberRole(role?: string): FamilyPlanMemberRole {
  return FAMILY_MEMBER_ROLES.includes(role as FamilyPlanMemberRole) ? role as FamilyPlanMemberRole : 'parent'
}

function makePublicKey(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function serializeAccount(account) {
  return {
    id: account.id,
    nickname: account.nickname,
    avatarUrl: account.avatarUrl,
  }
}

function serializeFamilyMembership(member) {
  return {
    id: member.family.id,
    familyId: member.family.id,
    familyKey: member.family.familyKey,
    name: member.family.name,
    role: member.role,
    status: member.status,
    ownerAccountId: member.family.ownerAccountId,
  }
}

@Injectable()
export class FamilyPlanService {
  constructor(private readonly prisma: PrismaService) {}

  async loginWechat(dto: WechatFamilyPlanLoginDto) {
    const wechatOpenId = await this.exchangeCodeForOpenId(dto.code)
    const legacyUser = await this.prisma.user.findUnique({ where: { openId: wechatOpenId } })
    const account = await this.prisma.familyPlanAccount.upsert({
      where: { wechatOpenId },
      update: {
        ...(legacyUser?.id && { legacyUserId: legacyUser.id }),
        ...(dto.nickname !== undefined && { nickname: dto.nickname.trim() || null }),
        ...(dto.avatarUrl !== undefined && { avatarUrl: dto.avatarUrl }),
      },
      create: {
        wechatOpenId,
        legacyUserId: legacyUser?.id,
        nickname: dto.nickname?.trim() || legacyUser?.name || '微信用户',
        avatarUrl: dto.avatarUrl || legacyUser?.avatar,
      },
    })
    const families = await this.getFamilyMemberships(account.id)
    const activeFamily = families[0] || null
    const token = signSession(activeFamily
      ? {
        role: 'parent',
        accountId: account.id,
        familyId: activeFamily.familyId,
        familyKey: activeFamily.familyKey,
        familyName: activeFamily.name,
        memberRole: activeFamily.role,
        name: account.nickname || '家长',
      }
      : {
        role: 'parent',
        accountId: account.id,
        name: account.nickname || '家长',
      })

    return {
      token,
      role: 'parent',
      account: serializeAccount(account),
      families,
      activeFamily,
      familyKey: activeFamily?.familyKey || '',
      name: account.nickname || '家长',
    }
  }

  async loginParent(dto: ParentLoginDto) {
    if (dto.code !== PARENT_DEMO_CODE) {
      throw new UnauthorizedException('验证码不正确')
    }

    await this.ensureFamilyRecord(AUDIT_FAMILY_KEY, '审核家庭')
    await this.ensureSeedData(AUDIT_FAMILY_KEY)
    return {
      token: signSession({
        role: 'parent',
        familyKey: AUDIT_FAMILY_KEY,
        name: '家长',
      }),
      role: 'parent',
      familyKey: AUDIT_FAMILY_KEY,
      name: '家长',
    }
  }

  async loginChild(dto: ChildLoginDto) {
    await this.ensureSeedData(AUDIT_FAMILY_KEY)
    const child = await this.prisma.familyPlanChild.findFirst({
      where: {
        familyKey: AUDIT_FAMILY_KEY,
        childCode: dto.childCode.trim().toUpperCase(),
        pinCode: dto.pinCode,
      },
    })

    if (!child) {
      throw new UnauthorizedException('孩子码或 PIN 不正确')
    }

    return {
      token: signSession({
        role: 'child',
        familyKey: AUDIT_FAMILY_KEY,
        childId: child.childKey,
        name: child.name,
      }),
      role: 'child',
      familyKey: AUDIT_FAMILY_KEY,
      childId: child.childKey,
      name: child.name,
      avatar: child.avatar,
    }
  }

  async listFamilies(authorization?: string) {
    const session = this.requireAccountSession(authorization)
    const families = await this.getFamilyMemberships(session.accountId)
    const activeFamily = families.find((item) => item.familyId === session.familyId || item.familyKey === session.familyKey) || families[0] || null
    return {
      families,
      activeFamily,
      familyKey: activeFamily?.familyKey || '',
    }
  }

  async createFamily(dto: CreateFamilyPlanFamilyDto, authorization?: string) {
    const session = this.requireAccountSession(authorization)
    const familyKey = await this.createUniqueFamilyKey()
    const family = await this.prisma.familyPlanFamily.create({
      data: {
        familyKey,
        name: normalizeFamilyName(dto.name),
        ownerAccountId: session.accountId,
        members: {
          create: {
            accountId: session.accountId,
            role: 'owner',
            status: 'active',
          },
        },
      },
    })
    await this.ensureSeedData(family.familyKey)

    const membership = await this.getMembership(session.accountId, family.id)
    return this.toParentAuthResult(session.accountId, membership)
  }

  async switchFamily(id: string, authorization?: string) {
    const session = this.requireAccountSession(authorization)
    const membership = await this.findMembershipByFamilyIdentity(session.accountId, id)
    if (!membership) {
      throw new ForbiddenException('你还没有加入这个家庭')
    }
    return this.toParentAuthResult(session.accountId, membership)
  }

  async createInvite(dto: CreateFamilyPlanInviteDto, authorization?: string) {
    const session = this.requireActiveFamilySession(authorization)
    if (session.memberRole === 'viewer') {
      throw new ForbiddenException('只有家庭成员可以邀请')
    }
    const invite = await this.prisma.familyPlanInvite.create({
      data: {
        familyId: session.familyId,
        inviteCode: await this.createUniqueInviteCode(),
        role: normalizeMemberRole(dto.role),
        maxUses: dto.maxUses,
        createdByAccountId: session.accountId,
      },
      include: {
        family: true,
      },
    })

    return {
      id: invite.id,
      inviteCode: invite.inviteCode,
      role: invite.role,
      familyId: invite.familyId,
      familyKey: invite.family.familyKey,
      familyName: invite.family.name,
      maxUses: invite.maxUses,
      usedCount: invite.usedCount,
      status: invite.status,
    }
  }

  async joinInvite(dto: JoinFamilyPlanInviteDto, authorization?: string) {
    const session = this.requireAccountSession(authorization)
    const inviteCode = normalizeInviteCode(dto.inviteCode)
    if (inviteCode === AUDIT_INVITE_CODE) {
      await this.ensureAuditInvite()
    }

    const invite = await this.prisma.familyPlanInvite.findUnique({
      where: { inviteCode },
      include: { family: true },
    })
    if (!invite || invite.status !== 'active') {
      throw new NotFoundException('邀请码不存在')
    }
    if (invite.expiresAt && invite.expiresAt < new Date()) {
      throw new BadRequestException('邀请码已过期')
    }
    if (invite.maxUses !== null && invite.maxUses !== undefined && invite.usedCount >= invite.maxUses) {
      throw new BadRequestException('邀请码已用完')
    }

    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.familyPlanFamilyMember.findUnique({
        where: {
          familyId_accountId: {
            familyId: invite.familyId,
            accountId: session.accountId,
          },
        },
      })
      if (existing?.status === 'active') {
        return
      }
      if (existing) {
        await tx.familyPlanFamilyMember.update({
          where: { id: existing.id },
          data: {
            role: normalizeMemberRole(invite.role),
            status: 'active',
          },
        })
      } else {
        await tx.familyPlanFamilyMember.create({
          data: {
            familyId: invite.familyId,
            accountId: session.accountId,
            role: normalizeMemberRole(invite.role),
            status: 'active',
          },
        })
      }
      await tx.familyPlanInvite.update({
        where: { id: invite.id },
        data: {
          usedCount: {
            increment: 1,
          },
        },
      })
    })

    await this.ensureSeedData(invite.family.familyKey)
    const membership = await this.getMembership(session.accountId, invite.familyId)
    return this.toParentAuthResult(session.accountId, membership)
  }

  async getPlan(familyKey = DEFAULT_FAMILY_KEY, authorization?: string) {
    const session = verifySession(authorization)
    if (session?.accountId && !session.familyKey) {
      return this.emptyPlan(session)
    }
    const resolvedFamilyKey = session?.familyKey || familyKey || DEFAULT_FAMILY_KEY
    await this.ensureSeedData(resolvedFamilyKey)

    const [children, courses, habits, tasks, milestones, completions, gifts, redemptions, pointLedger] = await Promise.all([
      this.prisma.familyPlanChild.findMany({ where: { familyKey: resolvedFamilyKey }, orderBy: { createdAt: 'asc' } }),
      this.prisma.familyPlanCourse.findMany({ where: { familyKey: resolvedFamilyKey }, orderBy: { createdAt: 'asc' } }),
      this.prisma.familyPlanHabit.findMany({ where: { familyKey: resolvedFamilyKey }, orderBy: { createdAt: 'asc' } }),
      this.prisma.familyPlanTask.findMany({ where: { familyKey: resolvedFamilyKey }, orderBy: { createdAt: 'asc' } }),
      this.prisma.familyPlanMilestone.findMany({ where: { familyKey: resolvedFamilyKey }, orderBy: { date: 'asc' } }),
      this.prisma.familyPlanCompletion.findMany({ where: { familyKey: resolvedFamilyKey } }),
      this.prisma.familyPlanGift.findMany({ where: { familyKey: resolvedFamilyKey }, orderBy: { createdAt: 'asc' } }),
      this.prisma.familyPlanRedemption.findMany({ where: { familyKey: resolvedFamilyKey }, orderBy: { createdAt: 'desc' } }),
      this.prisma.familyPlanPointLedger.findMany({ where: { familyKey: resolvedFamilyKey }, orderBy: { createdAt: 'desc' }, take: 60 }),
    ])
    const visibleChildKey = session?.role === 'child' ? session.childId : undefined
    const visibleChildren = visibleChildKey ? children.filter((item) => item.childKey === visibleChildKey) : children
    const visibleCourses = visibleChildKey ? courses.filter((item) => item.childKey === visibleChildKey) : courses
    const visibleHabits = visibleChildKey ? habits.filter((item) => item.childKey === visibleChildKey) : habits
    const visibleTasks = visibleChildKey ? tasks.filter((item) => item.childKey === visibleChildKey) : tasks
    const visibleRedemptions = visibleChildKey ? redemptions.filter((item) => item.childKey === visibleChildKey) : redemptions
    const visiblePointLedger = visibleChildKey ? pointLedger.filter((item) => item.childKey === visibleChildKey) : pointLedger
    const rules = await this.listRules(resolvedFamilyKey, visibleChildKey)

    return {
      session,
      children: visibleChildren.map((item) => ({
        id: item.childKey,
        childCode: item.childCode,
        name: item.name,
        avatar: item.avatar,
        grade: item.grade,
        ageBand: item.ageBand,
        points: item.points,
      })),
      courses: visibleCourses.map((item) => ({
        id: item.id,
        childId: item.childKey,
        subject: item.subject,
        teacher: item.teacher,
        startDate: item.startDate,
        settlementDate: item.settlementDate,
        weekday: item.weekday,
        weekdays: item.weekdays,
        schedules: normalizeCourseSchedules(item.schedules, item.weekday, item.time),
        extraSessions: normalizeCourseExtraSessions(item.extraSessions),
        time: item.time,
        durationMinutes: item.durationMinutes,
        focusMode: item.focusMode,
        focusMinutes: item.focusMinutes,
        breakMinutes: item.breakMinutes,
        successPoints: item.successPoints,
        failurePoints: item.failurePoints,
        allowMakeup: item.allowMakeup,
        makeupPoints: item.makeupPoints,
        successRule: item.successRule,
        makeupRule: item.makeupRule,
        failureRule: item.failureRule,
      })),
      habits: visibleHabits.map((item) => ({
        id: item.id,
        childId: item.childKey,
        title: item.title,
        frequency: item.frequency,
        weekdays: item.weekdays,
        startDate: item.startDate,
        endDate: item.endDate,
        time: item.time,
        meta: item.meta,
        completionCount: completions.filter((completion) => completion.completed && completion.itemKey.startsWith(`habit-${item.id}-`)).length,
        focusMode: item.focusMode,
        focusMinutes: item.focusMinutes,
        breakMinutes: item.breakMinutes,
        successPoints: item.successPoints,
        failurePoints: item.failurePoints,
        allowMakeup: item.allowMakeup,
        makeupPoints: item.makeupPoints,
        successRule: item.successRule,
        makeupRule: item.makeupRule,
        failureRule: item.failureRule,
      })),
      tasks: visibleTasks.map((item) => ({
        id: item.id,
        childId: item.childKey,
        title: item.title,
        dueDate: item.dueDate,
        time: item.time,
        meta: item.meta,
        focusMode: item.focusMode,
        focusMinutes: item.focusMinutes,
        breakMinutes: item.breakMinutes,
        successPoints: item.successPoints,
        failurePoints: item.failurePoints,
        allowMakeup: item.allowMakeup,
        makeupPoints: item.makeupPoints,
        successRule: item.successRule,
        makeupRule: item.makeupRule,
        failureRule: item.failureRule,
      })),
      milestones: milestones.map((item) => ({
        id: item.id,
        title: item.title,
        date: item.date,
      })),
      completions: completions.reduce<Record<string, { completed: boolean; status: string; pointsDelta: number; isMakeup: boolean }>>((result, item) => {
        result[item.itemKey] = {
          completed: item.completed,
          status: item.status,
          pointsDelta: item.pointsDelta,
          isMakeup: item.isMakeup,
        }
        return result
      }, {}),
      gifts: gifts.map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        imageUrl: normalizeGiftImageUrl(item.imageUrl),
        pointsCost: item.pointsCost,
        stock: item.stock,
        active: item.active,
      })),
      redemptions: visibleRedemptions.map((item) => ({
        id: item.id,
        childId: item.childKey,
        giftId: item.giftId,
        giftTitle: item.giftTitle,
        pointsCost: item.pointsCost,
        status: item.status,
        note: item.note,
        decidedAt: item.decidedAt,
        createdAt: item.createdAt,
      })),
      pointLedger: visiblePointLedger.map((item) => ({
        id: item.id,
        childId: item.childKey,
        sourceType: item.sourceType,
        sourceId: item.sourceId,
        pointsDelta: item.pointsDelta,
        balanceAfter: item.balanceAfter,
        note: item.note,
        createdAt: item.createdAt,
      })),
      rules,
    }
  }

  async updateChild(childKey: string, dto: UpdateFamilyPlanChildDto, authorization?: string) {
    const session = verifySession(authorization)
    const familyKey = this.resolveFamilyKey(dto.familyKey, authorization)
    if (session?.role === 'child' && session.childId !== childKey) {
      throw new ForbiddenException('只能修改自己的资料')
    }

    await this.ensureUpdated(
      this.prisma.familyPlanChild.updateMany({
        where: { familyKey, childKey },
        data: {
          name: dto.name,
          avatar: dto.avatar,
          grade: dto.grade,
          ageBand: getAgeBandFromGrade(dto.grade),
        },
      }),
      '孩子不存在',
    )

    const child = await this.prisma.familyPlanChild.findFirstOrThrow({ where: { familyKey, childKey } })
    return {
      id: child.childKey,
      childCode: child.childCode,
      name: child.name,
      avatar: child.avatar,
      grade: child.grade,
      ageBand: child.ageBand,
      points: child.points,
    }
  }

  async createCourse(dto: CreateFamilyPlanCourseDto, authorization?: string) {
    this.assertParentIfAuthenticated(authorization)
    const familyKey = this.resolveFamilyKey(dto.familyKey, authorization)
    const childGrade = await this.getChildGrade(familyKey, dto.childId)
    const item = await this.prisma.familyPlanCourse.create({
      data: {
        familyKey,
        childKey: dto.childId,
        subject: dto.subject,
        teacher: dto.teacher,
        startDate: dto.startDate,
        settlementDate: dto.settlementDate,
        weekday: dto.weekday,
        weekdays: dto.weekdays || [dto.weekday],
        schedules: normalizeCourseSchedules(dto.schedules, dto.weekday, dto.time),
        extraSessions: normalizeCourseExtraSessions(dto.extraSessions),
        time: dto.time,
        durationMinutes: dto.durationMinutes,
        ...focusData(dto),
        ...rewardData(dto, defaultReward('course', childGrade)),
      },
    })
    return { ...item, childId: item.childKey }
  }

  async createHabit(dto: CreateFamilyPlanHabitDto, authorization?: string) {
    this.assertParentIfAuthenticated(authorization)
    const familyKey = this.resolveFamilyKey(dto.familyKey, authorization)
    const childGrade = await this.getChildGrade(familyKey, dto.childId)
    const item = await this.prisma.familyPlanHabit.create({
      data: {
        familyKey,
        childKey: dto.childId,
        title: dto.title,
        frequency: dto.frequency || 'daily',
        weekdays: dto.weekdays || [],
        startDate: dto.startDate,
        endDate: dto.endDate,
        time: dto.time,
        meta: dto.meta || '每日习惯',
        ...focusData(dto),
        ...rewardData(dto, defaultReward('habit', childGrade)),
      },
    })
    return { ...item, childId: item.childKey }
  }

  async createTask(dto: CreateFamilyPlanTaskDto, authorization?: string) {
    this.assertParentIfAuthenticated(authorization)
    const familyKey = this.resolveFamilyKey(dto.familyKey, authorization)
    const childGrade = await this.getChildGrade(familyKey, dto.childId)
    const item = await this.prisma.familyPlanTask.create({
      data: {
        familyKey,
        childKey: dto.childId,
        title: dto.title,
        dueDate: dto.dueDate,
        time: dto.time,
        meta: dto.meta || '任务',
        ...focusData(dto),
        ...rewardData(dto, defaultReward('task', childGrade)),
      },
    })
    return { ...item, childId: item.childKey }
  }

  async createMilestone(dto: CreateFamilyPlanMilestoneDto, authorization?: string) {
    this.assertParentIfAuthenticated(authorization)
    const familyKey = this.resolveFamilyKey(dto.familyKey, authorization)
    return this.prisma.familyPlanMilestone.create({
      data: {
        familyKey,
        title: dto.title,
        date: dto.date,
      },
    })
  }

  async createGift(dto: CreateFamilyPlanGiftDto, authorization?: string) {
    this.assertParentIfAuthenticated(authorization)
    assertGiftImageUrl(dto.imageUrl)
    const title = normalizeGiftTitle(dto.title)
    const familyKey = this.resolveFamilyKey(dto.familyKey, authorization)
    return this.prisma.familyPlanGift.create({
      data: {
        familyKey,
        title,
        description: dto.description?.trim(),
        imageUrl: dto.imageUrl,
        pointsCost: dto.pointsCost,
        stock: dto.stock,
        active: dto.active ?? true,
      },
    })
  }

  async createRule(dto: CreateFamilyPlanRuleDto, authorization?: string) {
    this.assertParentIfAuthenticated(authorization)
    const familyKey = this.resolveFamilyKey(dto.familyKey, authorization)
    await this.ensureChildScope(familyKey, dto.childId)
    const item = await this.prisma.familyPlanRule.create({
      data: {
        familyKey,
        childKey: dto.childId?.trim() || null,
        title: dto.title.trim(),
        body: dto.body.trim(),
      },
    })

    return this.serializeRule(item)
  }

  async createRedemption(dto: CreateFamilyPlanRedemptionDto, authorization?: string) {
    const session = verifySession(authorization)
    const familyKey = this.resolveFamilyKey(dto.familyKey, authorization)
    const childKey = session?.role === 'child' ? session.childId : dto.childId
    if (!childKey) {
      throw new BadRequestException('缺少孩子')
    }
    if (session?.role === 'child' && dto.childId && dto.childId !== session.childId) {
      throw new ForbiddenException('只能用自己的积分兑换')
    }

    return this.prisma.$transaction(async (tx) => {
      const gift = await tx.familyPlanGift.findFirst({ where: { id: dto.giftId, familyKey } })
      if (!gift || !gift.active) {
        throw new NotFoundException('礼品不存在')
      }
      if (gift.stock <= 0) {
        throw new BadRequestException('礼品库存不足')
      }

      const child = await tx.familyPlanChild.findUnique({
        where: {
          familyKey_childKey: {
            familyKey,
            childKey,
          },
        },
      })
      if (!child) {
        throw new NotFoundException('孩子不存在')
      }
      if (child.points < gift.pointsCost) {
        throw new BadRequestException('积分不足')
      }

      const updatedChild = await tx.familyPlanChild.update({
        where: {
          familyKey_childKey: {
            familyKey,
            childKey,
          },
        },
        data: {
          points: {
            decrement: gift.pointsCost,
          },
        },
      })
      await tx.familyPlanGift.update({
        where: { id: gift.id },
        data: {
          stock: {
            decrement: 1,
          },
        },
      })
      const redemption = await tx.familyPlanRedemption.create({
        data: {
          familyKey,
          childKey,
          giftId: gift.id,
          giftTitle: gift.title,
          pointsCost: gift.pointsCost,
          status: 'pending',
          note: '孩子申请兑换，等待家长确认',
        },
      })
      await tx.familyPlanPointLedger.create({
        data: {
          familyKey,
          childKey,
          sourceType: 'redemption',
          sourceId: redemption.id,
          pointsDelta: -gift.pointsCost,
          balanceAfter: updatedChild.points,
          note: `申请兑换：${gift.title}`,
        },
      })

      return {
        id: redemption.id,
        childId: redemption.childKey,
        giftId: redemption.giftId,
        giftTitle: redemption.giftTitle,
        pointsCost: redemption.pointsCost,
        status: redemption.status,
        note: redemption.note,
        createdAt: redemption.createdAt,
      }
    })
  }

  async updateCourse(id: string, dto: UpdateFamilyPlanCourseDto, authorization?: string) {
    this.assertParentIfAuthenticated(authorization)
    const familyKey = this.resolveFamilyKey(dto.familyKey, authorization)
    const childGrade = await this.getChildGrade(familyKey, dto.childId)
    await this.ensureUpdated(
      this.prisma.familyPlanCourse.updateMany({
        where: { id, familyKey },
        data: {
          childKey: dto.childId,
          subject: dto.subject,
          teacher: dto.teacher,
          startDate: dto.startDate,
          settlementDate: dto.settlementDate,
          weekday: dto.weekday,
          weekdays: dto.weekdays || [dto.weekday],
          schedules: normalizeCourseSchedules(dto.schedules, dto.weekday, dto.time),
          extraSessions: normalizeCourseExtraSessions(dto.extraSessions),
          time: dto.time,
          durationMinutes: dto.durationMinutes,
          ...focusData(dto),
          ...rewardData(dto, defaultReward('course', childGrade)),
        },
      }),
      '课程不存在',
    )

    const item = await this.prisma.familyPlanCourse.findFirstOrThrow({ where: { id, familyKey } })
    return { ...item, childId: item.childKey }
  }

  async updateHabit(id: string, dto: UpdateFamilyPlanHabitDto, authorization?: string) {
    this.assertParentIfAuthenticated(authorization)
    const familyKey = this.resolveFamilyKey(dto.familyKey, authorization)
    const childGrade = await this.getChildGrade(familyKey, dto.childId)
    await this.ensureUpdated(
      this.prisma.familyPlanHabit.updateMany({
        where: { id, familyKey },
        data: {
          childKey: dto.childId,
          title: dto.title,
          frequency: dto.frequency || 'daily',
          weekdays: dto.weekdays || [],
          startDate: dto.startDate,
          endDate: dto.endDate,
          time: dto.time,
          meta: dto.meta || '每日习惯',
          ...focusData(dto),
          ...rewardData(dto, defaultReward('habit', childGrade)),
        },
      }),
      '习惯不存在',
    )

    const item = await this.prisma.familyPlanHabit.findFirstOrThrow({ where: { id, familyKey } })
    return { ...item, childId: item.childKey }
  }

  async updateTask(id: string, dto: UpdateFamilyPlanTaskDto, authorization?: string) {
    this.assertParentIfAuthenticated(authorization)
    const familyKey = this.resolveFamilyKey(dto.familyKey, authorization)
    const childGrade = await this.getChildGrade(familyKey, dto.childId)
    await this.ensureUpdated(
      this.prisma.familyPlanTask.updateMany({
        where: { id, familyKey },
        data: {
          childKey: dto.childId,
          title: dto.title,
          dueDate: dto.dueDate,
          time: dto.time,
          meta: dto.meta || '任务',
          ...focusData(dto),
          ...rewardData(dto, defaultReward('task', childGrade)),
        },
      }),
      '任务不存在',
    )

    const item = await this.prisma.familyPlanTask.findFirstOrThrow({ where: { id, familyKey } })
    return { ...item, childId: item.childKey }
  }

  async updateMilestone(id: string, dto: UpdateFamilyPlanMilestoneDto, authorization?: string) {
    this.assertParentIfAuthenticated(authorization)
    const familyKey = this.resolveFamilyKey(dto.familyKey, authorization)
    await this.ensureUpdated(
      this.prisma.familyPlanMilestone.updateMany({
        where: { id, familyKey },
        data: {
          title: dto.title,
          date: dto.date,
        },
      }),
      '节点不存在',
    )

    return this.prisma.familyPlanMilestone.findFirstOrThrow({ where: { id, familyKey } })
  }

  async updateGift(id: string, dto: UpdateFamilyPlanGiftDto, authorization?: string) {
    this.assertParentIfAuthenticated(authorization)
    assertGiftImageUrl(dto.imageUrl)
    const title = normalizeGiftTitle(dto.title)
    const familyKey = this.resolveFamilyKey(dto.familyKey, authorization)
    await this.ensureUpdated(
      this.prisma.familyPlanGift.updateMany({
        where: { id, familyKey },
        data: {
          title,
          description: dto.description?.trim(),
          imageUrl: dto.imageUrl,
          pointsCost: dto.pointsCost,
          stock: dto.stock,
          active: dto.active ?? true,
        },
      }),
      '礼品不存在',
    )

    return this.prisma.familyPlanGift.findFirstOrThrow({ where: { id, familyKey } })
  }

  async updateRule(id: string, dto: UpdateFamilyPlanRuleDto, authorization?: string) {
    this.assertParentIfAuthenticated(authorization)
    const familyKey = this.resolveFamilyKey(dto.familyKey, authorization)
    await this.ensureChildScope(familyKey, dto.childId)
    await this.ensureUpdated(
      this.prisma.familyPlanRule.updateMany({
        where: { id, familyKey },
        data: {
          childKey: dto.childId?.trim() || null,
          title: dto.title.trim(),
          body: dto.body.trim(),
        },
      }),
      '规则不存在',
    )

    const item = await this.prisma.familyPlanRule.findFirstOrThrow({ where: { id, familyKey } })
    return this.serializeRule(item)
  }

  async updateRedemptionStatus(id: string, dto: UpdateFamilyPlanRedemptionStatusDto, authorization?: string) {
    this.assertParentIfAuthenticated(authorization)
    const familyKey = this.resolveFamilyKey(dto.familyKey, authorization)

    return this.prisma.$transaction(async (tx) => {
      const redemption = await tx.familyPlanRedemption.findFirst({ where: { id, familyKey } })
      if (!redemption) {
        throw new NotFoundException('兑换申请不存在')
      }
      if (redemption.status !== 'pending') {
        throw new BadRequestException('兑换申请已处理')
      }

      if (dto.status === 'approved') {
        const approved = await tx.familyPlanRedemption.update({
          where: { id },
          data: {
            status: 'approved',
            note: '家长已确认兑换',
            decidedAt: new Date(),
          },
        })
        return { ...approved, childId: approved.childKey }
      }

      const updatedChild = await tx.familyPlanChild.update({
        where: {
          familyKey_childKey: {
            familyKey,
            childKey: redemption.childKey,
          },
        },
        data: {
          points: {
            increment: redemption.pointsCost,
          },
        },
      })
      await tx.familyPlanGift.update({
        where: { id: redemption.giftId },
        data: {
          stock: {
            increment: 1,
          },
        },
      })
      const rejected = await tx.familyPlanRedemption.update({
        where: { id },
        data: {
          status: 'rejected',
          note: '家长已拒绝，积分已退回',
          decidedAt: new Date(),
        },
      })
      await tx.familyPlanPointLedger.create({
        data: {
          familyKey,
          childKey: redemption.childKey,
          sourceType: 'redemption_refund',
          sourceId: redemption.id,
          pointsDelta: redemption.pointsCost,
          balanceAfter: updatedChild.points,
          note: `退回兑换：${redemption.giftTitle}`,
        },
      })

      return { ...rejected, childId: rejected.childKey }
    })
  }

  async deleteCourse(id: string, familyKey = DEFAULT_FAMILY_KEY, authorization?: string) {
    this.assertParentIfAuthenticated(authorization)
    return this.deleteWithCompletions('course', id, this.resolveFamilyKey(familyKey, authorization))
  }

  async deleteHabit(id: string, familyKey = DEFAULT_FAMILY_KEY, authorization?: string) {
    this.assertParentIfAuthenticated(authorization)
    return this.deleteWithCompletions('habit', id, this.resolveFamilyKey(familyKey, authorization))
  }

  async deleteTask(id: string, familyKey = DEFAULT_FAMILY_KEY, authorization?: string) {
    this.assertParentIfAuthenticated(authorization)
    return this.deleteWithCompletions('task', id, this.resolveFamilyKey(familyKey, authorization))
  }

  async deleteMilestone(id: string, familyKey = DEFAULT_FAMILY_KEY, authorization?: string) {
    this.assertParentIfAuthenticated(authorization)
    const resolvedFamilyKey = this.resolveFamilyKey(familyKey, authorization)
    const result = await this.prisma.familyPlanMilestone.deleteMany({ where: { id, familyKey: resolvedFamilyKey } })
    if (result.count === 0) {
      throw new NotFoundException('节点不存在')
    }
    return { deleted: true, id }
  }

  async deleteGift(id: string, familyKey = DEFAULT_FAMILY_KEY, authorization?: string) {
    this.assertParentIfAuthenticated(authorization)
    const resolvedFamilyKey = this.resolveFamilyKey(familyKey, authorization)
    const result = await this.prisma.familyPlanGift.deleteMany({ where: { id, familyKey: resolvedFamilyKey } })
    if (result.count === 0) {
      throw new NotFoundException('礼品不存在')
    }
    return { deleted: true, id }
  }

  async deleteRule(id: string, familyKey = DEFAULT_FAMILY_KEY, authorization?: string) {
    this.assertParentIfAuthenticated(authorization)
    const resolvedFamilyKey = this.resolveFamilyKey(familyKey, authorization)
    const result = await this.prisma.familyPlanRule.deleteMany({ where: { id, familyKey: resolvedFamilyKey } })
    if (result.count === 0) {
      throw new NotFoundException('规则不存在')
    }
    return { deleted: true, id }
  }

  async updateCompletion(
    familyKey: string | undefined,
    itemKey: string,
    completed: boolean,
    isMakeup = false,
    authorization?: string,
  ) {
    const session = verifySession(authorization)
    const resolvedFamilyKey = this.resolveFamilyKey(familyKey, authorization)
    const rewardSource = await this.getRewardSource(resolvedFamilyKey, itemKey)
    if (session?.role === 'child' && rewardSource.childKey !== session.childId) {
      throw new ForbiddenException('只能完成自己的任务')
    }
    if (completed && isMakeup && !rewardSource.allowMakeup) {
      throw new BadRequestException('这个项目不允许补卡')
    }
    if (completed && !isMakeup && isBeforeStartTime(rewardSource.date, rewardSource.time)) {
      throw new BadRequestException('还没到开始时间')
    }

    const existing = await this.prisma.familyPlanCompletion.findUnique({
      where: {
        familyKey_itemKey: {
          familyKey: resolvedFamilyKey,
          itemKey,
        },
      },
    })

    if (completed && session?.role === 'child') {
      if (existing?.completed) return existing
      return this.prisma.familyPlanCompletion.upsert({
        where: {
          familyKey_itemKey: {
            familyKey: resolvedFamilyKey,
            itemKey,
          },
        },
        create: {
          familyKey: resolvedFamilyKey,
          itemKey,
          completed: false,
          status: 'pending',
          isMakeup,
          pointsDelta: 0,
        },
        update: {
          completed: false,
          status: 'pending',
          isMakeup,
          pointsDelta: 0,
        },
      })
    }

    const nextPointsDelta = completed
      ? (isMakeup ? rewardSource.makeupPoints : rewardSource.successPoints)
      : rewardSource.failurePoints
    const childPointsDelta = nextPointsDelta - (existing?.pointsDelta || 0)

    return this.prisma.$transaction(async (tx) => {
      const completion = await tx.familyPlanCompletion.upsert({
        where: {
          familyKey_itemKey: {
            familyKey: resolvedFamilyKey,
            itemKey,
          },
        },
        create: {
          familyKey: resolvedFamilyKey,
          itemKey,
          completed,
          status: 'confirmed',
          isMakeup,
          pointsDelta: nextPointsDelta,
        },
        update: {
          completed,
          status: 'confirmed',
          isMakeup,
          pointsDelta: nextPointsDelta,
        },
      })

      if (childPointsDelta !== 0) {
        const child = await tx.familyPlanChild.update({
          where: {
            familyKey_childKey: {
              familyKey: resolvedFamilyKey,
              childKey: rewardSource.childKey,
            },
          },
          data: {
            points: {
              increment: childPointsDelta,
            },
          },
        })
        await tx.familyPlanPointLedger.create({
          data: {
            familyKey: resolvedFamilyKey,
            childKey: rewardSource.childKey,
            sourceType: 'completion',
            sourceId: itemKey,
            pointsDelta: childPointsDelta,
            balanceAfter: child.points,
            note: completed
              ? `${existing?.status === 'pending' ? '确认完成' : isMakeup ? '补卡完成' : '完成项目'}：${rewardSource.title}`
              : `调整完成：${rewardSource.title}`,
          },
        })
      }

      return completion
    })
  }

  private async ensureUpdated(updateResult: Promise<{ count: number }>, message: string) {
    const result = await updateResult
    if (result.count === 0) {
      throw new NotFoundException(message)
    }
  }

  private async exchangeCodeForOpenId(code: string): Promise<string> {
    const appId = process.env.WX_APP_ID
    const appSecret = process.env.WX_APP_SECRET

    if (!appId || !appSecret) {
      return `dev_openid_${code}`
    }

    const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appId}&secret=${appSecret}&js_code=${code}&grant_type=authorization_code`
    const response = await fetch(url)
    const data = (await response.json()) as { openid?: string; errcode?: number; errmsg?: string }

    if (!data.openid) {
      throw new UnauthorizedException(`WeChat login failed: ${data.errmsg || 'unknown error'}`)
    }

    return data.openid
  }

  private async getFamilyMemberships(accountId: string) {
    const memberships = await this.prisma.familyPlanFamilyMember.findMany({
      where: {
        accountId,
        status: 'active',
      },
      include: {
        family: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    })
    return memberships.map(serializeFamilyMembership)
  }

  private async getMembership(accountId: string, familyId: string) {
    const membership = await this.prisma.familyPlanFamilyMember.findUnique({
      where: {
        familyId_accountId: {
          familyId,
          accountId,
        },
      },
      include: {
        family: true,
      },
    })
    if (!membership || membership.status !== 'active') {
      throw new ForbiddenException('你还没有加入这个家庭')
    }
    return membership
  }

  private async findMembershipByFamilyIdentity(accountId: string, familyIdentity: string) {
    return this.prisma.familyPlanFamilyMember.findFirst({
      where: {
        accountId,
        status: 'active',
        family: {
          OR: [
            { id: familyIdentity },
            { familyKey: familyIdentity },
          ],
        },
      },
      include: {
        family: true,
      },
    })
  }

  private async toParentAuthResult(accountId: string, membership) {
    const account = await this.prisma.familyPlanAccount.findUnique({ where: { id: accountId } })
    if (!account) {
      throw new UnauthorizedException('账号不存在')
    }
    const activeFamily = serializeFamilyMembership(membership)
    const families = await this.getFamilyMemberships(accountId)
    return {
      token: signSession({
        role: 'parent',
        accountId,
        familyId: activeFamily.familyId,
        familyKey: activeFamily.familyKey,
        familyName: activeFamily.name,
        memberRole: normalizeMemberRole(activeFamily.role),
        name: account.nickname || '家长',
      }),
      role: 'parent',
      familyKey: activeFamily.familyKey,
      name: account.nickname || '家长',
      account: serializeAccount(account),
      activeFamily,
      families,
    }
  }

  private requireAccountSession(authorization?: string): FamilyPlanSession & { accountId: string } {
    const session = verifySession(authorization)
    if (!session?.accountId) {
      throw new UnauthorizedException('请先微信登录')
    }
    return session as FamilyPlanSession & { accountId: string }
  }

  private requireActiveFamilySession(authorization?: string): FamilyPlanSession & { accountId: string; familyId: string; familyKey: string } {
    const session = this.requireAccountSession(authorization)
    if (!session.familyId || !session.familyKey) {
      throw new BadRequestException('请先创建或加入家庭')
    }
    return session as FamilyPlanSession & { accountId: string; familyId: string; familyKey: string }
  }

  private async createUniqueFamilyKey() {
    for (let i = 0; i < 8; i += 1) {
      const familyKey = makePublicKey('family')
      const existing = await this.prisma.familyPlanFamily.findUnique({ where: { familyKey } })
      if (!existing) {
        return familyKey
      }
    }
    throw new BadRequestException('家庭编号生成失败，请重试')
  }

  private async createUniqueInviteCode() {
    for (let i = 0; i < 8; i += 1) {
      const inviteCode = Math.random().toString(36).slice(2, 8).toUpperCase()
      const existing = await this.prisma.familyPlanInvite.findUnique({ where: { inviteCode } })
      if (!existing) {
        return inviteCode
      }
    }
    throw new BadRequestException('邀请码生成失败，请重试')
  }

  private async ensureFamilyRecord(familyKey: string, name: string) {
    return this.prisma.familyPlanFamily.upsert({
      where: { familyKey },
      update: {},
      create: {
        familyKey,
        name,
      },
    })
  }

  private async ensureAuditInvite() {
    const family = await this.ensureFamilyRecord(AUDIT_FAMILY_KEY, '审核家庭')
    await this.prisma.familyPlanInvite.upsert({
      where: { inviteCode: AUDIT_INVITE_CODE },
      update: {
        familyId: family.id,
        role: 'parent',
        status: 'active',
        maxUses: null,
      },
      create: {
        familyId: family.id,
        inviteCode: AUDIT_INVITE_CODE,
        role: 'parent',
        status: 'active',
      },
    })
    await this.ensureSeedData(AUDIT_FAMILY_KEY)
  }

  private emptyPlan(session: FamilyPlanSession) {
    return {
      session,
      children: [],
      courses: [],
      habits: [],
      tasks: [],
      milestones: [],
      completions: {},
      gifts: [],
      redemptions: [],
      pointLedger: [],
      rules: [],
    }
  }

  private resolveFamilyKey(familyKey?: string, authorization?: string) {
    const session = verifySession(authorization)
    if (session?.accountId && !session.familyKey) {
      throw new BadRequestException('请先创建或加入家庭')
    }
    return session?.familyKey || familyKey || DEFAULT_FAMILY_KEY
  }

  private assertParentIfAuthenticated(authorization?: string) {
    const session = verifySession(authorization)
    if (session && session.role !== 'parent') {
      throw new ForbiddenException('只有家长可以管理计划')
    }
    if (session?.accountId && !session.familyKey) {
      throw new BadRequestException('请先创建或加入家庭')
    }
    if (session?.memberRole === 'viewer') {
      throw new ForbiddenException('只有家长可以管理计划')
    }
  }

  private async getChildGrade(familyKey: string, childKey: string) {
    const child = await this.prisma.familyPlanChild.findFirst({ where: { familyKey, childKey } })
    return child?.grade || '四年级'
  }

  private async ensureChildScope(familyKey: string, childKey?: string) {
    if (!childKey?.trim()) return
    const child = await this.prisma.familyPlanChild.findFirst({ where: { familyKey, childKey } })
    if (!child) {
      throw new NotFoundException('孩子不存在')
    }
  }

  private serializeRule(item) {
    return {
      id: item.id,
      childId: item.childKey,
      title: item.title,
      body: item.body,
      scope: item.childKey ? 'child' : 'common',
    }
  }

  private async getRewardSource(familyKey: string, itemKey: string) {
    const match = itemKey.match(/^(course|habit|task)-(.+)-(\d{4}-\d{2}-\d{2})$/)
    if (!match) {
      throw new NotFoundException('项目不存在')
    }

    const [, category, id, date] = match as [string, 'course' | 'habit' | 'task', string, string]
    if (category === 'course') {
      const item = await this.prisma.familyPlanCourse.findFirst({ where: { familyKey, id } })
      if (!item) throw new NotFoundException('课程不存在')
      return {
        category,
        date,
        time: getCourseTimeForDate(item, date),
        childKey: item.childKey,
        title: item.subject,
        successPoints: item.successPoints,
        failurePoints: item.failurePoints,
        allowMakeup: item.allowMakeup,
        makeupPoints: item.makeupPoints,
      }
    }
    if (category === 'habit') {
      const item = await this.prisma.familyPlanHabit.findFirst({ where: { familyKey, id } })
      if (!item) throw new NotFoundException('习惯不存在')
      return {
        category,
        date,
        time: item.time,
        childKey: item.childKey,
        title: item.title,
        successPoints: item.successPoints,
        failurePoints: item.failurePoints,
        allowMakeup: item.allowMakeup,
        makeupPoints: item.makeupPoints,
      }
    }

    const item = await this.prisma.familyPlanTask.findFirst({ where: { familyKey, id } })
    if (!item) throw new NotFoundException('任务不存在')
    return {
      category,
      date,
      time: item.time,
      childKey: item.childKey,
      title: item.title,
      successPoints: item.successPoints,
      failurePoints: item.failurePoints,
      allowMakeup: item.allowMakeup,
      makeupPoints: item.makeupPoints,
    }
  }

  private async listRules(familyKey: string, childKey?: string) {
    const rules = await this.prisma.familyPlanRule.findMany({
      where: childKey
        ? {
            familyKey,
            OR: [{ childKey: null }, { childKey }],
          }
        : { familyKey },
      orderBy: { createdAt: 'asc' },
    })

    return rules.map((item) => this.serializeRule(item))
  }

  private async deleteWithCompletions(category: 'course' | 'habit' | 'task', id: string, familyKey: string) {
    const [, deleted] = await this.prisma.$transaction([
      this.prisma.familyPlanCompletion.deleteMany({
        where: {
          familyKey,
          itemKey: {
            startsWith: `${category}-${id}-`,
          },
        },
      }),
      this.getDeleteOperation(category, id, familyKey),
    ])

    if (deleted.count === 0) {
      throw new NotFoundException('项目不存在')
    }

    return { deleted: true, id }
  }

  private getDeleteOperation(category: 'course' | 'habit' | 'task', id: string, familyKey: string) {
    if (category === 'course') {
      return this.prisma.familyPlanCourse.deleteMany({ where: { id, familyKey } })
    }
    if (category === 'habit') {
      return this.prisma.familyPlanHabit.deleteMany({ where: { id, familyKey } })
    }
    return this.prisma.familyPlanTask.deleteMany({ where: { id, familyKey } })
  }

  private async ensureSeedData(familyKey: string) {
    const seedMode = getSeedMode()
    const childCount = await this.prisma.familyPlanChild.count({ where: { familyKey } })
    if (childCount > 0) {
      if (seedMode !== 'off') {
        await this.ensureSeedMetadata(familyKey)
      }
      return
    }

    if (seedMode === 'off') {
      return
    }

    if (seedMode === 'starter') {
      await this.prisma.$transaction(
        defaultChildren.map((item) =>
          this.prisma.familyPlanChild.create({
            data: { ...item, familyKey, ageBand: getAgeBandFromGrade(item.grade) },
          }),
        ),
      )
      await this.ensureSeedMetadata(familyKey)
      return
    }

    await this.prisma.$transaction([
      ...defaultChildren.map((item) =>
        this.prisma.familyPlanChild.create({
          data: { ...item, familyKey, ageBand: getAgeBandFromGrade(item.grade) },
        }),
      ),
      ...defaultCourses.map((item) =>
        this.prisma.familyPlanCourse.create({
          data: {
            ...item,
            familyKey,
            ...rewardData({}, defaultReward('course', this.defaultChildGrade(item.childKey))),
          },
        }),
      ),
      ...defaultHabits.map((item) =>
        this.prisma.familyPlanHabit.create({
          data: {
            ...item,
            familyKey,
            ...rewardData({}, defaultReward('habit', this.defaultChildGrade(item.childKey))),
          },
        }),
      ),
      ...defaultTasks.map((item) =>
        this.prisma.familyPlanTask.create({
          data: {
            ...item,
            familyKey,
            ...rewardData({}, defaultReward('task', this.defaultChildGrade(item.childKey))),
          },
        }),
      ),
      ...defaultMilestones.map((item) =>
        this.prisma.familyPlanMilestone.create({
          data: { ...item, familyKey },
        }),
      ),
      ...defaultCompletions.map((item) =>
        this.prisma.familyPlanCompletion.create({
          data: { ...item, familyKey },
        }),
      ),
      ...defaultRules.map((item) =>
        this.prisma.familyPlanRule.create({
          data: { ...item, familyKey },
        }),
      ),
      ...defaultGifts.map((item) =>
        this.prisma.familyPlanGift.create({
          data: { ...item, familyKey },
        }),
      ),
    ])
  }

  private defaultChildGrade(childKey: string) {
    return defaultChildren.find((item) => item.childKey === childKey)?.grade || '四年级'
  }

  private async ensureSeedMetadata(familyKey: string) {
    await Promise.all([
      ...defaultChildren.map((item) =>
        this.prisma.familyPlanChild.updateMany({
          where: { familyKey, childKey: item.childKey },
          data: {
            childCode: item.childCode,
            pinCode: item.pinCode,
            avatar: item.avatar,
          },
        }),
      ),
      ...defaultCourses.map((item) =>
        this.prisma.familyPlanCourse.updateMany({
          where: { familyKey, id: item.id },
          data: rewardData({}, defaultReward('course', this.defaultChildGrade(item.childKey))),
        }),
      ),
      ...defaultHabits.map((item) =>
        this.prisma.familyPlanHabit.updateMany({
          where: { familyKey, id: item.id },
          data: rewardData({}, defaultReward('habit', this.defaultChildGrade(item.childKey))),
        }),
      ),
      ...defaultTasks.map((item) =>
        this.prisma.familyPlanTask.updateMany({
          where: { familyKey, id: item.id },
          data: rewardData({}, defaultReward('task', this.defaultChildGrade(item.childKey))),
        }),
      ),
    ])

    const ruleCount = await this.prisma.familyPlanRule.count({ where: { familyKey } })
    if (ruleCount === 0) {
      await this.prisma.$transaction(
        defaultRules.map((item) =>
          this.prisma.familyPlanRule.create({
            data: { ...item, familyKey },
          }),
        ),
      )
    }

    const giftCount = await this.prisma.familyPlanGift.count({ where: { familyKey } })
    if (giftCount === 0) {
      await this.prisma.$transaction(
        defaultGifts.map((item) =>
          this.prisma.familyPlanGift.create({
            data: { ...item, familyKey },
          }),
        ),
      )
    }
  }
}
