import { IsObject } from 'class-validator'

export class UpdateAppearanceDto {
  @IsObject()
  appearance: Record<string, any>
}
