import { IsInt, Min, IsOptional, IsObject } from 'class-validator'

export class AddExpDto {
  @IsInt()
  @Min(1)
  amount: number

  @IsOptional()
  @IsObject()
  attributes?: {
    wisdom?: number
    lifeSkill?: number
    social?: number
    creativity?: number
    art?: number
    luck?: number
  }
}
