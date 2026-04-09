import { IsObject } from 'class-validator'

export class UpdateEquipmentDto {
  @IsObject()
  equipment: Record<string, any>
}
