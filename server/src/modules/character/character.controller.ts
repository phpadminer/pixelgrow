import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
} from '@nestjs/common'
import { CharacterService } from './character.service'
import { CreateCharacterDto, UpdateCharacterDto, AddExpDto } from './character.dto'

@Controller('characters')
export class CharacterController {
  constructor(private readonly characterService: CharacterService) {}

  @Post()
  create(@Body() dto: CreateCharacterDto) {
    return this.characterService.create(dto)
  }

  @Get(':userId')
  findByUserId(@Param('userId') userId: string) {
    return this.characterService.findByUserId(userId)
  }

  @Put(':userId')
  update(@Param('userId') userId: string, @Body() dto: UpdateCharacterDto) {
    return this.characterService.update(userId, dto)
  }

  @Post(':userId/exp')
  addExp(@Param('userId') userId: string, @Body() dto: AddExpDto) {
    return this.characterService.addExp(userId, dto)
  }

  @Post(':userId/snapshot')
  createSnapshot(
    @Param('userId') userId: string,
    @Query('note') note?: string,
  ) {
    return this.characterService.createSnapshot(userId, note)
  }
}
