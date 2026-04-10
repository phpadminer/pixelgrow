import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
} from '@nestjs/common'
import { TaskService } from './task.service'
import { CreateTaskDto, CompleteTaskDto } from './task.dto'
import { TaskStatus } from '@prisma/client'

@Controller('tasks')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Post()
  create(@Body() dto: CreateTaskDto) {
    return this.taskService.create(dto)
  }

  @Get()
  findAll(
    @Query('familyId') familyId: string,
    @Query('date') date?: string,
    @Query('status') status?: TaskStatus,
  ) {
    return this.taskService.findAll({ familyId, date, status })
  }

  @Get('today')
  findToday(@Query('familyId') familyId: string) {
    return this.taskService.findToday(familyId)
  }

  @Put(':id/start')
  start(@Param('id') id: string) {
    return this.taskService.start(id)
  }

  @Put(':id/complete')
  complete(@Param('id') id: string, @Body() dto: CompleteTaskDto) {
    return this.taskService.complete(id, dto.verificationData)
  }
}
