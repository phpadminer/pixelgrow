import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'
type PetMood = 'happy' | 'curious' | 'sleepy'

interface HomeTask {
  id: string
  icon: string
  title: string
  status: TaskStatus
  rewards: {
    exp: number
    coins: number
  }
}

export interface HomeSummaryResponse {
  character: {
    name: string
    level: number
    exp: number
    profession: string
  }
  pet: {
    name: string
    level: number
    mood: PetMood
    species: string
  }
  todayTasks: HomeTask[]
  expPercent: number
  nextLevelExp: number
}

@Injectable()
export class HomeService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(characterId?: string): Promise<HomeSummaryResponse> {
    const character = characterId
      ? await this.loadCharacter(characterId)
      : this.defaultCharacter()

    const pet = this.defaultPet()
    const todayTasks = this.defaultTasks()

    const nextLevelExp = character.level * 100
    const expPercent = Math.min(
      100,
      Math.round((character.exp / nextLevelExp) * 100),
    )

    return {
      character,
      pet,
      todayTasks,
      expPercent,
      nextLevelExp,
    }
  }

  private async loadCharacter(characterId: string) {
    const row = await this.prisma.character.findUnique({
      where: { id: characterId },
    })
    if (!row) {
      throw new NotFoundException('Character not found')
    }
    return {
      name: row.name,
      level: row.level,
      exp: row.exp,
      profession: row.profession,
    }
  }

  private defaultCharacter() {
    return {
      name: '小明',
      level: 5,
      exp: 340,
      profession: '音乐骑士',
    }
  }

  private defaultPet() {
    return {
      name: '火小狐',
      level: 3,
      mood: 'happy' as const,
      species: 'foxling',
    }
  }

  private defaultTasks(): HomeTask[] {
    return [
      {
        id: 'task-1',
        icon: '📚',
        title: '完成今日作业',
        rewards: { exp: 30, coins: 20 },
        status: 'PENDING',
      },
      {
        id: 'task-2',
        icon: '🎵',
        title: '圆号练习 20 分钟',
        rewards: { exp: 40, coins: 25 },
        status: 'IN_PROGRESS',
      },
      {
        id: 'task-3',
        icon: '🏠',
        title: '整理书桌',
        rewards: { exp: 15, coins: 10 },
        status: 'COMPLETED',
      },
    ]
  }
}
