import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common'
import { UserService } from './user.service'
import { AuthGuard } from './auth.guard'

@Controller('auth')
export class UserController {
  constructor(private userService: UserService) {}

  @Post('login')
  async login(@Body('code') code: string) {
    return this.userService.loginWithWechat(code)
  }

  @Get('profile')
  @UseGuards(AuthGuard)
  async getProfile(@Req() req: any) {
    return this.userService.getProfile(req.user.sub)
  }
}
