import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsArray,
  IsObject,
  MaxLength,
  ValidateNested,
} from 'class-validator'
import { Type } from 'class-transformer'

export class CreateWorldDto {
  @IsString()
  @IsNotEmpty()
  familyId: string
}

export class CreateRegionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name: string

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  fantasyName: string

  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  type: string

  @IsOptional()
  @IsBoolean()
  unlocked?: boolean

  @IsOptional()
  @IsObject()
  realLocation?: Record<string, unknown>

  @IsOptional()
  @IsArray()
  buildings?: unknown[]

  @IsOptional()
  @IsArray()
  npcs?: unknown[]
}

export class UpdateRegionDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string

  @IsOptional()
  @IsString()
  @MaxLength(50)
  fantasyName?: string

  @IsOptional()
  @IsArray()
  buildings?: unknown[]

  @IsOptional()
  @IsArray()
  npcs?: unknown[]
}

export class BuildingDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  id: string

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name: string

  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  type: string

  @IsOptional()
  @IsObject()
  position?: Record<string, unknown>

  @IsOptional()
  @IsObject()
  meta?: Record<string, unknown>
}

export class AddBuildingDto {
  @ValidateNested()
  @Type(() => BuildingDto)
  building: BuildingDto
}
