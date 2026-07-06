import { Body, Controller, Delete, Get, Headers, Param, Post, Put, Query } from '@nestjs/common'
import { FamilyPlanService } from './family-plan.service'
import {
  ChildLoginDto,
  CreateFamilyPlanFamilyDto,
  CreateFamilyPlanGiftDto,
  CreateFamilyPlanCourseDto,
  CreateFamilyPlanHabitDto,
  CreateFamilyPlanInviteDto,
  CreateFamilyPlanMilestoneDto,
  CreateFamilyPlanRedemptionDto,
  CreateFamilyPlanRuleDto,
  CreateFamilyPlanTaskDto,
  JoinFamilyPlanInviteDto,
  ParentLoginDto,
  UpdateFamilyPlanChildDto,
  UpdateFamilyPlanCourseDto,
  UpdateFamilyPlanGiftDto,
  UpdateFamilyPlanHabitDto,
  UpdateFamilyPlanCompletionDto,
  UpdateFamilyPlanMilestoneDto,
  UpdateFamilyPlanRedemptionStatusDto,
  UpdateFamilyPlanRuleDto,
  UpdateFamilyPlanTaskDto,
  WechatFamilyPlanLoginDto,
} from './family-plan.dto'

@Controller('family-plan')
export class FamilyPlanController {
  constructor(private readonly familyPlanService: FamilyPlanService) {}

  @Post('auth/wechat')
  loginWechat(@Body() dto: WechatFamilyPlanLoginDto) {
    return this.familyPlanService.loginWechat(dto)
  }

  @Post('auth/parent')
  loginParent(@Body() dto: ParentLoginDto) {
    return this.familyPlanService.loginParent(dto)
  }

  @Post('auth/child')
  loginChild(@Body() dto: ChildLoginDto) {
    return this.familyPlanService.loginChild(dto)
  }

  @Get('families')
  listFamilies(@Headers('authorization') authorization?: string) {
    return this.familyPlanService.listFamilies(authorization)
  }

  @Post('families')
  createFamily(@Body() dto: CreateFamilyPlanFamilyDto, @Headers('authorization') authorization?: string) {
    return this.familyPlanService.createFamily(dto, authorization)
  }

  @Post('families/:id/switch')
  switchFamily(@Param('id') id: string, @Headers('authorization') authorization?: string) {
    return this.familyPlanService.switchFamily(id, authorization)
  }

  @Post('invites')
  createInvite(@Body() dto: CreateFamilyPlanInviteDto, @Headers('authorization') authorization?: string) {
    return this.familyPlanService.createInvite(dto, authorization)
  }

  @Post('invites/join')
  joinInvite(@Body() dto: JoinFamilyPlanInviteDto, @Headers('authorization') authorization?: string) {
    return this.familyPlanService.joinInvite(dto, authorization)
  }

  @Get()
  getPlan(@Query('familyKey') familyKey?: string, @Headers('authorization') authorization?: string) {
    return this.familyPlanService.getPlan(familyKey, authorization)
  }

  @Put('children/:childKey')
  updateChild(
    @Param('childKey') childKey: string,
    @Body() dto: UpdateFamilyPlanChildDto,
    @Headers('authorization') authorization?: string,
  ) {
    return this.familyPlanService.updateChild(childKey, dto, authorization)
  }

  @Post('courses')
  createCourse(@Body() dto: CreateFamilyPlanCourseDto, @Headers('authorization') authorization?: string) {
    return this.familyPlanService.createCourse(dto, authorization)
  }

  @Post('habits')
  createHabit(@Body() dto: CreateFamilyPlanHabitDto, @Headers('authorization') authorization?: string) {
    return this.familyPlanService.createHabit(dto, authorization)
  }

  @Post('tasks')
  createTask(@Body() dto: CreateFamilyPlanTaskDto, @Headers('authorization') authorization?: string) {
    return this.familyPlanService.createTask(dto, authorization)
  }

  @Post('milestones')
  createMilestone(@Body() dto: CreateFamilyPlanMilestoneDto, @Headers('authorization') authorization?: string) {
    return this.familyPlanService.createMilestone(dto, authorization)
  }

  @Post('gifts')
  createGift(@Body() dto: CreateFamilyPlanGiftDto, @Headers('authorization') authorization?: string) {
    return this.familyPlanService.createGift(dto, authorization)
  }

  @Post('rules')
  createRule(@Body() dto: CreateFamilyPlanRuleDto, @Headers('authorization') authorization?: string) {
    return this.familyPlanService.createRule(dto, authorization)
  }

  @Post('redemptions')
  createRedemption(@Body() dto: CreateFamilyPlanRedemptionDto, @Headers('authorization') authorization?: string) {
    return this.familyPlanService.createRedemption(dto, authorization)
  }

  @Put('courses/:id')
  updateCourse(@Param('id') id: string, @Body() dto: UpdateFamilyPlanCourseDto, @Headers('authorization') authorization?: string) {
    return this.familyPlanService.updateCourse(id, dto, authorization)
  }

  @Put('habits/:id')
  updateHabit(@Param('id') id: string, @Body() dto: UpdateFamilyPlanHabitDto, @Headers('authorization') authorization?: string) {
    return this.familyPlanService.updateHabit(id, dto, authorization)
  }

  @Put('tasks/:id')
  updateTask(@Param('id') id: string, @Body() dto: UpdateFamilyPlanTaskDto, @Headers('authorization') authorization?: string) {
    return this.familyPlanService.updateTask(id, dto, authorization)
  }

  @Put('milestones/:id')
  updateMilestone(@Param('id') id: string, @Body() dto: UpdateFamilyPlanMilestoneDto, @Headers('authorization') authorization?: string) {
    return this.familyPlanService.updateMilestone(id, dto, authorization)
  }

  @Put('gifts/:id')
  updateGift(@Param('id') id: string, @Body() dto: UpdateFamilyPlanGiftDto, @Headers('authorization') authorization?: string) {
    return this.familyPlanService.updateGift(id, dto, authorization)
  }

  @Put('rules/:id')
  updateRule(@Param('id') id: string, @Body() dto: UpdateFamilyPlanRuleDto, @Headers('authorization') authorization?: string) {
    return this.familyPlanService.updateRule(id, dto, authorization)
  }

  @Put('redemptions/:id/status')
  updateRedemptionStatus(
    @Param('id') id: string,
    @Body() dto: UpdateFamilyPlanRedemptionStatusDto,
    @Headers('authorization') authorization?: string,
  ) {
    return this.familyPlanService.updateRedemptionStatus(id, dto, authorization)
  }

  @Delete('courses/:id')
  deleteCourse(@Param('id') id: string, @Query('familyKey') familyKey?: string, @Headers('authorization') authorization?: string) {
    return this.familyPlanService.deleteCourse(id, familyKey, authorization)
  }

  @Delete('habits/:id')
  deleteHabit(@Param('id') id: string, @Query('familyKey') familyKey?: string, @Headers('authorization') authorization?: string) {
    return this.familyPlanService.deleteHabit(id, familyKey, authorization)
  }

  @Delete('tasks/:id')
  deleteTask(@Param('id') id: string, @Query('familyKey') familyKey?: string, @Headers('authorization') authorization?: string) {
    return this.familyPlanService.deleteTask(id, familyKey, authorization)
  }

  @Delete('milestones/:id')
  deleteMilestone(@Param('id') id: string, @Query('familyKey') familyKey?: string, @Headers('authorization') authorization?: string) {
    return this.familyPlanService.deleteMilestone(id, familyKey, authorization)
  }

  @Delete('gifts/:id')
  deleteGift(@Param('id') id: string, @Query('familyKey') familyKey?: string, @Headers('authorization') authorization?: string) {
    return this.familyPlanService.deleteGift(id, familyKey, authorization)
  }

  @Delete('rules/:id')
  deleteRule(@Param('id') id: string, @Query('familyKey') familyKey?: string, @Headers('authorization') authorization?: string) {
    return this.familyPlanService.deleteRule(id, familyKey, authorization)
  }

  @Put('completions/:itemKey')
  updateCompletion(
    @Param('itemKey') itemKey: string,
    @Body() dto: UpdateFamilyPlanCompletionDto,
    @Headers('authorization') authorization?: string,
  ) {
    return this.familyPlanService.updateCompletion(dto.familyKey, itemKey, dto.completed, Boolean(dto.isMakeup), authorization)
  }
}
