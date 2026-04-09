import { IsEnum, IsOptional, IsObject, IsString } from 'class-validator'

export enum CompleteVerificationType {
  CONFIRM = 'CONFIRM',
  TIMER = 'TIMER',
  NFC = 'NFC',
}

export class CompleteTaskDto {
  @IsEnum(CompleteVerificationType)
  verificationType: CompleteVerificationType

  @IsOptional()
  @IsObject()
  verificationData?: Record<string, any>

  @IsOptional()
  @IsString()
  confirmedBy?: string
}
