import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { TaskStatus } from '@prisma/client'
import { CreateTaskDto } from './task.dto'

@Injectable()
export class TaskService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTaskDto) {
    return this.prisma.task.create({
      data: {
        familyId: dto.familyId,
        creatorId: dto.creatorId,
        assigneeId: dto.assigneeId,
        type: dto.type,
        title: dto.title,
        description: dto.description,
        verificationType: dto.verificationType,
        gpsData: dto.gpsData ?? undefined,
        rewards: dto.rewards ?? {},
      },
      include: { assignee: true, creator: true },
    })
  }

  async findAll(query: { date?: string; status?: TaskStatus; familyId: string }) {
    const where: any = { familyId: query.familyId }

    if (query.status) {
      where.status = query.status
    }

    if (query.date) {
      const start = new Date(query.date)
      const end = new Date(query.date)
      end.setDate(end.getDate() + 1)
      where.createdAt = { gte: start, lt: end }
    }

    return this.prisma.task.findMany({
      where,
      include: { assignee: true, creator: true },
      orderBy: { createdAt: 'desc' },
    })
  }

  async findToday(familyId: string) {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const end = new Date(start)
    end.setDate(end.getDate() + 1)

    return this.prisma.task.findMany({
      where: {
        familyId,
        createdAt: { gte: start, lt: end },
      },
      include: { assignee: true, creator: true },
      orderBy: { createdAt: 'desc' },
    })
  }

  async start(id: string) {
    const task = await this.prisma.task.findUnique({ where: { id } })
    if (!task) throw new NotFoundException('Task not found')
    if (task.status !== TaskStatus.PENDING) {
      throw new BadRequestException('Only pending tasks can be started')
    }

    return this.prisma.task.update({
      where: { id },
      data: { status: TaskStatus.IN_PROGRESS },
      include: { assignee: true, creator: true },
    })
  }

  async complete(id: string, verificationData?: any) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: { assignee: true },
    })
    if (!task) throw new NotFoundException('Task not found')
    if (task.status !== TaskStatus.IN_PROGRESS) {
      throw new BadRequestException('Only in-progress tasks can be completed')
    }

    const updated = await this.prisma.task.update({
      where: { id },
      data: {
        status: TaskStatus.COMPLETED,
        completedAt: new Date(),
      },
      include: { assignee: true, creator: true },
    })

    // Award exp to the assignee's character
    await this.addExpReward(task.assigneeId, task.rewards as any)

    return updated
  }

  private async addExpReward(userId: string, rewards: any) {
    const expAmount = rewards?.exp ?? 10

    const character = await this.prisma.character.findUnique({
      where: { userId },
    })

    if (!character) return

    const newExp = character.exp + expAmount
    const newLevel = Math.floor(newExp / 100) + 1

    await this.prisma.character.update({
      where: { userId },
      data: {
        exp: newExp,
        level: newLevel,
        // Apply attribute bonuses if specified
        ...(rewards?.wisdom && { wisdom: { increment: rewards.wisdom } }),
        ...(rewards?.lifeSkill && { lifeSkill: { increment: rewards.lifeSkill } }),
        ...(rewards?.social && { social: { increment: rewards.social } }),
        ...(rewards?.creativity && { creativity: { increment: rewards.creativity } }),
        ...(rewards?.art && { art: { increment: rewards.art } }),
        ...(rewards?.luck && { luck: { increment: rewards.luck } }),
      },
    })
  }
}
