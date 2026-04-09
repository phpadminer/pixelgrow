import { IsString, IsOptional } from 'class-validator'

export class UpdateFamilyDto {
  @IsString()
  @IsOptional()
  name?: string
}
