import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
} from '@nestjs/common'
import { FamilyService } from './family.service'
import { CreateFamilyDto, JoinFamilyDto, UpdateFamilyDto } from './family.dto'

@Controller('families')
export class FamilyController {
  constructor(private readonly familyService: FamilyService) {}

  @Post()
  create(@Body() dto: CreateFamilyDto) {
    return this.familyService.create(dto)
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.familyService.findById(id)
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateFamilyDto) {
    return this.familyService.update(id, dto)
  }

  @Post(':id/invite-code')
  generateInviteCode(@Param('id') id: string) {
    return this.familyService.generateInviteCode(id)
  }

  @Post('join')
  joinByInviteCode(@Body() dto: JoinFamilyDto) {
    return this.familyService.joinByInviteCode(dto)
  }

  @Get(':id/members')
  getMembers(@Param('id') id: string) {
    return this.familyService.getMembers(id)
  }
}
