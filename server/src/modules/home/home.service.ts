import { Injectable } from '@nestjs/common'

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
  getSummary(_userId?: string): HomeSummaryResponse {
    // Temporary seed data until Character/Task modules are connected.
    const character = {
      name: '小明',
      level: 5,
      exp: 340,
      profession: '音乐骑士',
    }

    const pet = {
      name: '火小狐',
      level: 3,
      mood: 'happy' as const,
      species: 'foxling',
    }

    const todayTasks: HomeTask[] = [
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
}
