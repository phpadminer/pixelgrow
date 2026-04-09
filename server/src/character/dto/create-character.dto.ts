import { IsString, IsOptional, IsObject } from 'class-validator'

export class CreateCharacterDto {
  @IsString()
  userId: string

  @IsString()
  name: string

  @IsOptional()
  @IsString()
  profession?: string

  @IsOptional()
  @IsObject()
  appearance?: Record<string, any>
}
