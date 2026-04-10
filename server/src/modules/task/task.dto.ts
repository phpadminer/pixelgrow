import { IsString, IsEnum, IsOptional, IsObject } from 'class-validator'
import { TaskType, VerificationType } from '@prisma/client'

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
  gpsData?: any

  @IsOptional()
  @IsObject()
  rewards?: any
}

export class CompleteTaskDto {
  @IsOptional()
  @IsObject()
  verificationData?: any
}
