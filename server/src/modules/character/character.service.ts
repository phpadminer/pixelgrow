import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { CreateCharacterDto, UpdateCharacterDto, AddExpDto } from './character.dto'

@Injectable()
export class CharacterService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCharacterDto) {
    const existing = await this.prisma.character.findUnique({
      where: { userId: dto.userId },
    })
    if (existing) {
      throw new ConflictException('User already has a character')
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

  async findByUserId(userId: string) {
    const character = await this.prisma.character.findUnique({
      where: { userId },
      include: { snapshots: { orderBy: { createdAt: 'desc' }, take: 5 } },
    })
    if (!character) {
      throw new NotFoundException('Character not found')
    }
    return character
  }

  async update(userId: string, dto: UpdateCharacterDto) {
    const character = await this.prisma.character.findUnique({
      where: { userId },
    })
    if (!character) {
      throw new NotFoundException('Character not found')
    }

    return this.prisma.character.update({
      where: { userId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.profession !== undefined && { profession: dto.profession }),
        ...(dto.appearance !== undefined && { appearance: dto.appearance }),
        ...(dto.equipment !== undefined && { equipment: dto.equipment }),
      },
    })
  }

  async addExp(userId: string, dto: AddExpDto) {
    if (dto.amount < 0) {
      throw new BadRequestException('Exp amount must not be negative')
    }

    // Use $transaction to prevent race conditions on concurrent exp updates
    return this.prisma.$transaction(async (tx) => {
      const character = await tx.character.findUnique({
        where: { userId },
      })
      if (!character) {
        throw new NotFoundException('Character not found')
      }

      const newExp = character.exp + dto.amount
      const newLevel = Math.floor(newExp / 100) + 1

      return tx.character.update({
        where: { userId },
        data: {
          exp: newExp,
          level: newLevel,
        },
      })
    })
  }

  async createSnapshot(userId: string, note?: string) {
    const character = await this.prisma.character.findUnique({
      where: { userId },
    })
    if (!character) {
      throw new NotFoundException('Character not found')
    }

    return this.prisma.characterSnapshot.create({
      data: {
        characterId: character.id,
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
}
