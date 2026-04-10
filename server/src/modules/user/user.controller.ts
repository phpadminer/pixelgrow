import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
} from '@nestjs/common'
import { UserService } from './user.service'
import { LoginDto, UpdateUserDto } from './user.dto'

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.userService.login(dto.code)
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.userService.findById(id)
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.userService.update(id, dto)
  }
}
