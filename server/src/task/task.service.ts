import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateTaskDto } from './dto/create-task.dto'
import { CompleteTaskDto } from './dto/complete-task.dto'
import { QueryTaskDto } from './dto/query-task.dto'

// Level-up exp thresholds: level N requires N*100 total exp
function getExpForLevel(level: number): number {
  return level * 100
}

@Injectable()
export class TaskService {
  constructor(private prisma: PrismaService) {}

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
        rewards: dto.rewards ?? { exp: 10, coins: 5 },
        gpsData: dto.gpsData ?? undefined,
      },
      include: { assignee: true, creator: true },
    })
  }

  async findAll(query: QueryTaskDto) {
    const where: any = {}

    if (query.familyId) where.familyId = query.familyId
    if (query.assigneeId) where.assigneeId = query.assigneeId
    if (query.status) where.status = query.status

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

  async findToday(assigneeId: string) {
    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const endOfDay = new Date(startOfDay)
    endOfDay.setDate(endOfDay.getDate() + 1)

    return this.prisma.task.findMany({
      where: {
        assigneeId,
        createdAt: { gte: startOfDay, lt: endOfDay },
      },
      include: { assignee: true, creator: true },
      orderBy: { createdAt: 'asc' },
    })
  }

  async start(id: string) {
    const task = await this.prisma.task.findUnique({ where: { id } })
    if (!task) throw new NotFoundException('Task not found')
    if (task.status !== 'PENDING') {
      throw new BadRequestException(`Cannot start task with status ${task.status}`)
    }

    return this.prisma.task.update({
      where: { id },
      data: { status: 'IN_PROGRESS' },
      include: { assignee: true, creator: true },
    })
  }

  async complete(id: string, dto: CompleteTaskDto) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: { assignee: true },
    })
    if (!task) throw new NotFoundException('Task not found')
    if (task.status !== 'IN_PROGRESS' && task.status !== 'PENDING') {
      throw new BadRequestException(`Cannot complete task with status ${task.status}`)
    }

    // Validate verification type matches
    if (dto.verificationType !== task.verificationType) {
      throw new BadRequestException(
        `Task requires ${task.verificationType} verification, got ${dto.verificationType}`,
      )
    }

    // Verify based on type
    this.validateVerification(dto)

    // Complete task + distribute rewards in a transaction
    const rewards = task.rewards as any
    const expReward = rewards?.exp ?? 10
    const coinReward = rewards?.coins ?? 5

    // Attribute bonuses from rewards
    const attrUpdates: Record<string, number> = {}
    for (const attr of ['wisdom', 'lifeSkill', 'social', 'creativity', 'art', 'luck']) {
      if (rewards?.[attr]) attrUpdates[attr] = rewards[attr]
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Mark task completed
      const completedTask = await tx.task.update({
        where: { id },
        data: { status: 'COMPLETED', completedAt: new Date() },
        include: { assignee: true, creator: true },
      })

      // 2. Update character exp + attributes
      const character = await tx.character.findUnique({
        where: { userId: task.assigneeId },
      })

      if (character) {
        let newExp = character.exp + expReward
        let newLevel = character.level

        // Auto level-up loop
        while (newExp >= getExpForLevel(newLevel)) {
          newExp -= getExpForLevel(newLevel)
          newLevel++
        }

        const updateData: any = {
          exp: newExp,
          level: newLevel,
        }

        // Add attribute bonuses
        for (const [attr, value] of Object.entries(attrUpdates)) {
          updateData[attr] = { increment: value }
        }

        await tx.character.update({
          where: { id: character.id },
          data: updateData,
        })
      }

      return completedTask
    })

    // Fetch updated character to return
    const character = await this.prisma.character.findUnique({
      where: { userId: task.assigneeId },
    })

    return {
      task: result,
      rewards: { exp: expReward, coins: coinReward, ...attrUpdates },
      character: character
        ? { level: character.level, exp: character.exp, leveledUp: character.level > ((task as any)._prevLevel ?? 0) }
        : null,
    }
  }

  private validateVerification(dto: CompleteTaskDto) {
    switch (dto.verificationType) {
      case 'CONFIRM':
        if (!dto.confirmedBy) {
          throw new BadRequestException('CONFIRM verification requires confirmedBy (parent userId)')
        }
        break
      case 'TIMER':
        if (!dto.verificationData?.duration) {
          throw new BadRequestException('TIMER verification requires verificationData.duration')
        }
        break
      case 'NFC':
        if (!dto.verificationData?.nfcId) {
          throw new BadRequestException('NFC verification requires verificationData.nfcId')
        }
        break
    }
  }
}
