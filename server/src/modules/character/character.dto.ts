import {
  IsString,
  IsInt,
  IsOptional,
  IsObject,
  IsBoolean,
  Min,
  MaxLength,
} from 'class-validator'

export class CreateCharacterDto {
  @IsOptional()
  @IsString()
  userId?: string

  @IsOptional()
  @IsBoolean()
  isGuest?: boolean = true

  @IsString()
  @MaxLength(50)
  name: string

  @IsOptional()
  @IsString()
  profession?: string

  @IsOptional()
  @IsObject()
  appearance?: Record<string, any>
}

export class UpdateCharacterDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string

  @IsOptional()
  @IsString()
  profession?: string

  @IsOptional()
  @IsObject()
  appearance?: Record<string, any>

  @IsOptional()
  @IsObject()
  equipment?: Record<string, any>
}

export class AddExpDto {
  @IsInt()
  @Min(0)
  amount: number

  @IsOptional()
  @IsString()
  source?: string
}
