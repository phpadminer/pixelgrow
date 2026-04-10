import { Controller, Get, Query } from '@nestjs/common'
import { HomeService } from './home.service'

@Controller('api/home')
export class HomeController {
  constructor(private readonly homeService: HomeService) {}

  @Get('summary')
  getSummary(@Query('userId') userId?: string) {
    return this.homeService.getSummary(userId)
  }
}
