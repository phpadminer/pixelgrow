import { IsOptional, IsString, IsEnum } from 'class-validator'

export enum QueryTaskStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  VERIFYING = 'VERIFYING',
  COMPLETED = 'COMPLETED',
  EXPIRED = 'EXPIRED',
}

export class QueryTaskDto {
  @IsOptional()
  @IsString()
  date?: string // YYYY-MM-DD

  @IsOptional()
  @IsEnum(QueryTaskStatus)
  status?: QueryTaskStatus

  @IsOptional()
  @IsString()
  assigneeId?: string

  @IsOptional()
  @IsString()
  familyId?: string
}
