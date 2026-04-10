import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class CharacterService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    userId: string
    name: string
    profession?: string
    appearance?: Record<string, any>
  }) {
    return this.prisma.character.create({
      data: {
        userId: data.userId,
        name: data.name,
        profession: data.profession ?? 'adventurer',
        appearance: data.appearance ?? {},
      },
    })
  }

  async findById(id: string) {
    const character = await this.prisma.character.findUnique({
      where: { id },
      include: { snapshots: { orderBy: { createdAt: 'desc' }, take: 5 } },
    })
    if (!character) throw new NotFoundException('Character not found')
    return character
  }

  async updateAppearance(id: string, appearance: Record<string, any>) {
    await this.ensureExists(id)
    return this.prisma.character.update({
      where: { id },
      data: { appearance },
    })
  }

  async updateEquipment(id: string, equipment: Record<string, any>) {
    await this.ensureExists(id)
    return this.prisma.character.update({
      where: { id },
      data: { equipment },
    })
  }

  async addExp(id: string, amount: number) {
    const character = await this.ensureExists(id)

    let { exp, level } = character
    exp += amount

    // 升级公式：下一级所需经验 = level * 100
    let requiredExp = level * 100
    while (exp >= requiredExp) {
      exp -= requiredExp
      level++
      requiredExp = level * 100
    }

    return this.prisma.character.update({
      where: { id },
      data: { exp, level },
    })
  }

  async createSnapshot(id: string, note?: string) {
    const character = await this.ensureExists(id)

    const modelData = {
      name: character.name,
      profession: character.profession,
      exp: character.exp,
      wisdom: character.wisdom,
      lifeSkill: character.lifeSkill,
      social: character.social,
      creativity: character.creativity,
      art: character.art,
      luck: character.luck,
      appearance: character.appearance,
      equipment: character.equipment,
    }

    return this.prisma.characterSnapshot.create({
      data: {
        characterId: id,
        level: character.level,
        modelData,
        note,
      },
    })
  }

  private async ensureExists(id: string) {
    const character = await this.prisma.character.findUnique({ where: { id } })
    if (!character) throw new NotFoundException('Character not found')
    return character
  }
}
