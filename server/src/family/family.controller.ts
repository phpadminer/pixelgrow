import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Headers,
  BadRequestException,
} from '@nestjs/common'
import { FamilyService } from './family.service'
import { CreateFamilyDto } from './dto/create-family.dto'
import { JoinFamilyDto } from './dto/join-family.dto'
import { UpdateFamilyDto } from './dto/update-family.dto'

@Controller('family')
export class FamilyController {
  constructor(private familyService: FamilyService) {}

  /** POST /family — 创建家庭 */
  @Post()
  create(@Body() dto: CreateFamilyDto) {
    return this.familyService.create(dto)
  }

  /** POST /family/join — 通过邀请码加入家庭 */
  @Post('join')
  join(@Body() dto: JoinFamilyDto) {
    return this.familyService.join(dto)
  }

  /** GET /family — 获取当前家庭信息和成员列表 */
  @Get()
  findOne(@Headers('x-family-id') familyId: string) {
    if (!familyId) {
      throw new BadRequestException('缺少 x-family-id 请求头')
    }
    return this.familyService.findOne(familyId)
  }

  /** PUT /family — 更新家庭信息 */
  @Put()
  update(
    @Headers('x-family-id') familyId: string,
    @Body() dto: UpdateFamilyDto,
  ) {
    if (!familyId) {
      throw new BadRequestException('缺少 x-family-id 请求头')
    }
    return this.familyService.update(familyId, dto)
  }
}
