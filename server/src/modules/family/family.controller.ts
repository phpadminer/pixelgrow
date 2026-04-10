import { Controller, Get, Post, Put, Body, Req } from '@nestjs/common'
import { FamilyService } from './family.service'

@Controller('family')
export class FamilyController {
  constructor(private readonly familyService: FamilyService) {}

  @Post()
  async create(@Body() body: { name: string }) {
    return this.familyService.create(body.name)
  }

  @Post('join')
  async join(@Body() body: { userId: string; inviteCode: string }) {
    return this.familyService.join(body.userId, body.inviteCode)
  }

  @Get()
  async get(@Req() req: { query: { familyId: string } }) {
    return this.familyService.findById(req.query.familyId)
  }

  @Put()
  async update(@Body() body: { familyId: string; name?: string }) {
    const { familyId, ...data } = body
    return this.familyService.update(familyId, data)
  }
}
