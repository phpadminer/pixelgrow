import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator'

export class LoginDto {
  @IsString()
  @IsNotEmpty({ message: 'code must not be empty' })
  code: string
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string

  @IsOptional()
  @IsString()
  avatar?: string
}
