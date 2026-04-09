import { IsString, IsEnum, IsOptional, IsObject } from 'class-validator'

export enum TaskType {
  STUDY = 'STUDY',
  LIFE = 'LIFE',
  SOCIAL = 'SOCIAL',
  SURPRISE = 'SURPRISE',
  GPS_QUEST = 'GPS_QUEST',
}

export enum VerificationType {
  CONFIRM = 'CONFIRM',
  TIMER = 'TIMER',
  NFC = 'NFC',
}

export class CreateTaskDto {
  @IsString()
  familyId: string

  @IsString()
  creatorId: string

  @IsString()
  assigneeId: string

  @IsEnum(TaskType)
  type: TaskType

  @IsString()
  title: string

  @IsString()
  description: string

  @IsEnum(VerificationType)
  verificationType: VerificationType

  @IsOptional()
  @IsObject()
  rewards?: { exp?: number; coins?: number; wisdom?: number; lifeSkill?: number; social?: number; creativity?: number; art?: number; luck?: number }

  @IsOptional()
  @IsObject()
  gpsData?: Record<string, any>
}
