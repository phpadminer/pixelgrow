import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common'
import { CharacterService } from './character.service'

@Controller('character')
export class CharacterController {
  constructor(private readonly characterService: CharacterService) {}

  @Post()
  create(
    @Body() body: { userId: string; name: string; profession?: string; appearance?: Record<string, any> },
  ) {
    return this.characterService.create(body)
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.characterService.findById(id)
  }

  @Put(':id/appearance')
  updateAppearance(
    @Param('id') id: string,
    @Body() body: { appearance: Record<string, any> },
  ) {
    return this.characterService.updateAppearance(id, body.appearance)
  }

  @Put(':id/equipment')
  updateEquipment(
    @Param('id') id: string,
    @Body() body: { equipment: Record<string, any> },
  ) {
    return this.characterService.updateEquipment(id, body.equipment)
  }

  @Post(':id/add-exp')
  addExp(
    @Param('id') id: string,
    @Body() body: { amount: number },
  ) {
    return this.characterService.addExp(id, body.amount)
  }

  @Post(':id/snapshot')
  createSnapshot(
    @Param('id') id: string,
    @Body() body: { note?: string },
  ) {
    return this.characterService.createSnapshot(id, body.note)
  }
}
