import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common'
import { CharacterService } from './character.service'
import { CreateCharacterDto } from './dto/create-character.dto'
import { UpdateAppearanceDto } from './dto/update-appearance.dto'
import { UpdateEquipmentDto } from './dto/update-equipment.dto'
import { AddExpDto } from './dto/add-exp.dto'
import { CreateSnapshotDto } from './dto/create-snapshot.dto'

@Controller('character')
@UsePipes(new ValidationPipe({ whitelist: true }))
export class CharacterController {
  constructor(private readonly characterService: CharacterService) {}

  @Post()
  create(@Body() dto: CreateCharacterDto) {
    return this.characterService.create(dto)
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.characterService.findById(id)
  }

  @Put(':id/appearance')
  updateAppearance(
    @Param('id') id: string,
    @Body() dto: UpdateAppearanceDto,
  ) {
    return this.characterService.updateAppearance(id, dto.appearance)
  }

  @Put(':id/equipment')
  updateEquipment(
    @Param('id') id: string,
    @Body() dto: UpdateEquipmentDto,
  ) {
    return this.characterService.updateEquipment(id, dto.equipment)
  }

  @Post(':id/add-exp')
  addExp(@Param('id') id: string, @Body() dto: AddExpDto) {
    return this.characterService.addExp(id, dto)
  }

  @Post(':id/snapshot')
  createSnapshot(@Param('id') id: string, @Body() dto: CreateSnapshotDto) {
    return this.characterService.createSnapshot(id, dto.note)
  }
}
