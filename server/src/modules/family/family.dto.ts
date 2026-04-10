import { IsString, IsNotEmpty, IsOptional, IsEnum, MaxLength } from 'class-validator'

export class CreateFamilyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name: string

  @IsString()
  @IsNotEmpty()
  creatorId: string
}

export class JoinFamilyDto {
  @IsString()
  @IsNotEmpty()
  inviteCode: string

  @IsString()
  @IsNotEmpty()
  userId: string
}

export class AddMemberDto {
  @IsString()
  @IsNotEmpty()
  userId: string

  @IsOptional()
  @IsEnum(['PARENT', 'CHILD'])
  role?: 'PARENT' | 'CHILD'
}

export class UpdateFamilyDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string
}
