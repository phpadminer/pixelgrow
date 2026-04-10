import { Controller, Get, Query } from '@nestjs/common'
import { HomeService } from './home.service'

@Controller('api/home')
export class HomeController {
  constructor(private readonly homeService: HomeService) {}

  @Get('summary')
  getSummary(@Query('characterId') characterId?: string) {
    return this.homeService.getSummary(characterId)
  }
}
