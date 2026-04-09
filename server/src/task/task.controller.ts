import { Controller, Get, Post, Put, Body, Param, Query } from '@nestjs/common'
import { TaskService } from './task.service'
import { CreateTaskDto } from './dto/create-task.dto'
import { CompleteTaskDto } from './dto/complete-task.dto'
import { QueryTaskDto } from './dto/query-task.dto'

@Controller('tasks')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Post()
  create(@Body() dto: CreateTaskDto) {
    return this.taskService.create(dto)
  }

  @Get()
  findAll(@Query() query: QueryTaskDto) {
    return this.taskService.findAll(query)
  }

  @Get('today')
  findToday(@Query('assigneeId') assigneeId: string) {
    return this.taskService.findToday(assigneeId)
  }

  @Put(':id/start')
  start(@Param('id') id: string) {
    return this.taskService.start(id)
  }

  @Put(':id/complete')
  complete(@Param('id') id: string, @Body() dto: CompleteTaskDto) {
    return this.taskService.complete(id, dto)
  }
}
