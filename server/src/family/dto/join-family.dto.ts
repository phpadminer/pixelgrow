import { IsString, IsNotEmpty, IsEnum } from 'class-validator'
import { UserRole } from '@prisma/client'

export class JoinFamilyDto {
  @IsString()
  @IsNotEmpty()
  inviteCode: string

  @IsString()
  @IsNotEmpty()
  memberName: string

  @IsEnum(UserRole)
  role: UserRole
}
