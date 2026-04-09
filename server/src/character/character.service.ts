import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateCharacterDto } from './dto/create-character.dto'
import { AddExpDto } from './dto/add-exp.dto'

// 升级经验公式: 每级所需经验 = level * 100
function expToNextLevel(level: number): number {
  return level * 100
}

@Injectable()
export class CharacterService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCharacterDto) {
    const existing = await this.prisma.character.findUnique({
      where: { userId: dto.userId },
    })
    if (existing) {
      throw new ConflictException('该用户已有角色')
    }

    return this.prisma.character.create({
      data: {
        userId: dto.userId,
        name: dto.name,
        profession: dto.profession ?? 'adventurer',
        appearance: dto.appearance ?? {},
      },
    })
  }

  async findById(id: string) {
    const character = await this.prisma.character.findUnique({
      where: { id },
      include: { snapshots: { orderBy: { createdAt: 'desc' }, take: 5 } },
    })
    if (!character) {
      throw new NotFoundException('角色不存在')
    }
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

  async addExp(id: string, dto: AddExpDto) {
    const character = await this.ensureExists(id)

    let { exp, level } = character
    exp += dto.amount

    // 自动升级
    while (exp >= expToNextLevel(level)) {
      exp -= expToNextLevel(level)
      level++
    }

    // 属性增长
    const attrs = dto.attributes ?? {}
    const data: Record<string, any> = {
      exp,
      level,
      wisdom: character.wisdom + (attrs.wisdom ?? 0),
      lifeSkill: character.lifeSkill + (attrs.lifeSkill ?? 0),
      social: character.social + (attrs.social ?? 0),
      creativity: character.creativity + (attrs.creativity ?? 0),
      art: character.art + (attrs.art ?? 0),
      luck: character.luck + (attrs.luck ?? 0),
    }

    const updated = await this.prisma.character.update({
      where: { id },
      data,
    })

    return {
      ...updated,
      leveledUp: level > character.level,
      levelsGained: level - character.level,
    }
  }

  async createSnapshot(id: string, note?: string) {
    const character = await this.ensureExists(id)

    return this.prisma.characterSnapshot.create({
      data: {
        characterId: id,
        level: character.level,
        modelData: {
          exp: character.exp,
          profession: character.profession,
          wisdom: character.wisdom,
          lifeSkill: character.lifeSkill,
          social: character.social,
          creativity: character.creativity,
          art: character.art,
          luck: character.luck,
          appearance: character.appearance,
          equipment: character.equipment,
        },
        note,
      },
    })
  }

  private async ensureExists(id: string) {
    const character = await this.prisma.character.findUnique({ where: { id } })
    if (!character) {
      throw new NotFoundException('角色不存在')
    }
    return character
  }
}
