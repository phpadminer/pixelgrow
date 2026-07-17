import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator'

export class FamilyKeyDto {
  @IsString()
  @IsOptional()
  familyKey?: string
}

class FamilyPlanFocusDto extends FamilyKeyDto {
  @IsString()
  @IsOptional()
  @IsIn(['pomodoro', 'custom'])
  focusMode?: 'pomodoro' | 'custom'

  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(600)
  focusMinutes?: number

  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(120)
  breakMinutes?: number

  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(20)
  successPoints?: number

  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(20)
  failurePoints?: number

  @IsBoolean()
  @IsOptional()
  allowMakeup?: boolean

  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(20)
  makeupPoints?: number

  @IsString()
  @IsOptional()
  @MaxLength(160)
  successRule?: string

  @IsString()
  @IsOptional()
  @MaxLength(160)
  makeupRule?: string

  @IsString()
  @IsOptional()
  @MaxLength(160)
  failureRule?: string
}

export class CreateFamilyPlanCourseDto extends FamilyPlanFocusDto {
  @IsString()
  @IsNotEmpty()
  childId: string

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  subject: string

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  teacher: string

  @IsString()
  @IsNotEmpty()
  startDate: string

  @IsString()
  @IsNotEmpty()
  settlementDate: string

  @IsInt()
  @Min(0)
  @Max(6)
  weekday: number

  @IsArray()
  @IsOptional()
  weekdays?: number[]

  @IsArray()
  @IsOptional()
  schedules?: Array<{ weekday: number; time: string; lessonType?: 'trial' | 'formal' | 'bonus' }>

  @IsArray()
  @IsOptional()
  extraSessions?: Array<{ date: string; time: string; lessonType?: 'trial' | 'formal' | 'bonus'; status?: 'skipped' | 'postponed'; sourceDate?: string }>

  @IsString()
  @IsNotEmpty()
  time: string

  @IsInt()
  @Min(1)
  @Max(600)
  durationMinutes: number
}

export class CreateFamilyPlanHabitDto extends FamilyPlanFocusDto {
  @IsString()
  @IsNotEmpty()
  childId: string

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  title: string

  @IsString()
  @IsOptional()
  frequency?: string

  @IsArray()
  @IsOptional()
  weekdays?: number[]

  @IsString()
  @IsOptional()
  startDate?: string

  @IsString()
  @IsOptional()
  endDate?: string

  @IsString()
  @IsOptional()
  time?: string

  @IsString()
  @IsOptional()
  meta?: string
}

export class CreateFamilyPlanTaskDto extends FamilyPlanFocusDto {
  @IsString()
  @IsNotEmpty()
  childId: string

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  title: string

  @IsString()
  @IsNotEmpty()
  dueDate: string

  @IsString()
  @IsOptional()
  time?: string

  @IsString()
  @IsOptional()
  meta?: string
}

export class CreateFamilyPlanMilestoneDto extends FamilyKeyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  title: string

  @IsString()
  @IsNotEmpty()
  date: string
}

export class UpdateFamilyPlanCompletionDto extends FamilyKeyDto {
  @IsBoolean()
  completed: boolean

  @IsBoolean()
  @IsOptional()
  isMakeup?: boolean
}

export class SaveFamilyPlanReminderSubscriptionDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['daily', 'deadline'])
  reminderType: 'daily' | 'deadline'

  @IsString()
  @IsNotEmpty()
  templateId: string

  @IsString()
  @IsNotEmpty()
  @IsIn(['accept', 'reject', 'ban', 'filter'])
  status: 'accept' | 'reject' | 'ban' | 'filter'

  @IsString()
  @IsOptional()
  @MaxLength(8)
  dailyTime?: string
}

export class SendFamilyPlanReminderTestDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['daily', 'deadline'])
  reminderType: 'daily' | 'deadline'
}

export class WechatFamilyPlanLoginDto {
  @IsString()
  @IsNotEmpty()
  code: string

  @IsString()
  @IsOptional()
  @MaxLength(50)
  nickname?: string

  @IsString()
  @IsOptional()
  avatarUrl?: string
}

export class ParentLoginDto {
  @IsString()
  @IsNotEmpty()
  phone: string

  @IsString()
  @IsNotEmpty()
  code: string
}

export class ChildLoginDto {
  @IsString()
  @IsNotEmpty()
  childCode: string

  @IsString()
  @IsNotEmpty()
  pinCode: string
}

export class CreateFamilyPlanFamilyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  name: string
}

export class UpdateFamilyPlanFamilyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  name: string
}

export class UpdateFamilyPlanMemberDto {
  @IsString()
  @IsOptional()
  @IsIn(['father', 'mother', 'paternalGrandpa', 'paternalGrandma', 'maternalGrandpa', 'maternalGrandma', 'guardian'])
  relation?: string
}

export class UpdateFamilyPlanMemberRoleDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['admin', 'parent', 'viewer'])
  role: 'admin' | 'parent' | 'viewer'
}

export class CreateFamilyPlanInviteDto {
  @IsString()
  @IsOptional()
  @IsIn(['admin', 'parent', 'viewer', 'child'])
  role?: 'admin' | 'parent' | 'viewer' | 'child'

  @IsString()
  @IsOptional()
  @IsIn(['father', 'mother', 'paternalGrandpa', 'paternalGrandma', 'maternalGrandpa', 'maternalGrandma', 'guardian'])
  relation?: string

  @IsString()
  @IsOptional()
  @MaxLength(80)
  childKey?: string

  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(999)
  maxUses?: number
}

export class JoinFamilyPlanInviteDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  inviteCode: string
}

export class UpdateFamilyPlanChildDto extends FamilyKeyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  name: string

  @IsString()
  @IsNotEmpty()
  @MaxLength(8)
  avatar: string

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  grade: string
}

export class CreateFamilyPlanChildDto extends UpdateFamilyPlanChildDto {}

export class UpdateFamilyPlanCourseDto extends CreateFamilyPlanCourseDto {}

export class UpdateFamilyPlanHabitDto extends CreateFamilyPlanHabitDto {}

export class UpdateFamilyPlanTaskDto extends CreateFamilyPlanTaskDto {}

export class UpdateFamilyPlanMilestoneDto extends CreateFamilyPlanMilestoneDto {}

export class CreateFamilyPlanRuleDto extends FamilyKeyDto {
  @IsString()
  @IsOptional()
  childId?: string

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  title: string

  @IsString()
  @IsNotEmpty()
  @MaxLength(600)
  body: string
}

export class UpdateFamilyPlanRuleDto extends CreateFamilyPlanRuleDto {}

export class CreateFamilyPlanGiftDto extends FamilyKeyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  title: string

  @IsString()
  @IsOptional()
  @MaxLength(160)
  description?: string

  @IsString()
  @IsNotEmpty()
  @MaxLength(200000)
  imageUrl: string

  @IsInt()
  @Min(1)
  @Max(100000)
  pointsCost: number

  @IsInt()
  @Min(0)
  @Max(999)
  stock: number

  @IsBoolean()
  @IsOptional()
  active?: boolean
}

export class UpdateFamilyPlanGiftDto extends CreateFamilyPlanGiftDto {}

export class CreateFamilyPlanRedemptionDto extends FamilyKeyDto {
  @IsString()
  @IsNotEmpty()
  giftId: string

  @IsString()
  @IsOptional()
  childId?: string
}

export class UpdateFamilyPlanRedemptionStatusDto extends FamilyKeyDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['approved', 'rejected'])
  status: 'approved' | 'rejected'
}
