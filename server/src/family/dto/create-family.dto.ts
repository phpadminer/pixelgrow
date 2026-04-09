import { IsString, IsNotEmpty, IsEnum } from 'class-validator'
import { UserRole } from '@prisma/client'

export class CreateFamilyDto {
  @IsString()
  @IsNotEmpty()
  familyName: string

  @IsString()
  @IsNotEmpty()
  creatorName: string

  @IsEnum(UserRole)
  creatorRole: UserRole = UserRole.PARENT
}
