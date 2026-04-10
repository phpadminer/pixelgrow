import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
} from '@nestjs/common'
import { WorldService } from './world.service'
import {
  CreateWorldDto,
  CreateRegionDto,
  UpdateRegionDto,
  AddBuildingDto,
} from './world.dto'

@Controller('worlds')
export class WorldController {
  constructor(private readonly worldService: WorldService) {}

  @Get('family/:familyId')
  getByFamily(@Param('familyId') familyId: string) {
    return this.worldService.getByFamily(familyId)
  }

  @Post()
  create(@Body() dto: CreateWorldDto) {
    return this.worldService.create(dto)
  }

  @Get(':id/regions')
  listRegions(@Param('id') id: string) {
    return this.worldService.listRegions(id)
  }

  @Post(':id/regions')
  addRegion(@Param('id') id: string, @Body() dto: CreateRegionDto) {
    return this.worldService.addRegion(id, dto)
  }

  @Put(':id/regions/:regionId/unlock')
  unlockRegion(
    @Param('id') id: string,
    @Param('regionId') regionId: string,
  ) {
    return this.worldService.unlockRegion(id, regionId)
  }

  @Put(':id/regions/:regionId')
  updateRegion(
    @Param('id') id: string,
    @Param('regionId') regionId: string,
    @Body() dto: UpdateRegionDto,
  ) {
    return this.worldService.updateRegion(id, regionId, dto)
  }

  @Post(':id/regions/:regionId/buildings')
  addBuilding(
    @Param('id') id: string,
    @Param('regionId') regionId: string,
    @Body() dto: AddBuildingDto,
  ) {
    return this.worldService.addBuilding(id, regionId, dto.building)
  }

  @Get(':id/exploration')
  getExploration(@Param('id') id: string) {
    return this.worldService.getExploration(id)
  }
}
