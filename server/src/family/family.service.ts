import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateFamilyDto } from './dto/create-family.dto'
import { JoinFamilyDto } from './dto/join-family.dto'
import { UpdateFamilyDto } from './dto/update-family.dto'
import { randomBytes } from 'crypto'

@Injectable()
export class FamilyService {
  constructor(private prisma: PrismaService) {}

  private generateInviteCode(): string {
    return randomBytes(4).toString('hex').toUpperCase()
  }

  async create(dto: CreateFamilyDto) {
    const inviteCode = this.generateInviteCode()

    const family = await this.prisma.family.create({
      data: {
        name: dto.familyName,
        inviteCode,
        members: {
          create: {
            name: dto.creatorName,
            role: dto.creatorRole,
          },
        },
      },
      include: { members: true },
    })

    return family
  }

  async join(dto: JoinFamilyDto) {
    const family = await this.prisma.family.findUnique({
      where: { inviteCode: dto.inviteCode },
    })

    if (!family) {
      throw new NotFoundException('无效的邀请码')
    }

    const member = await this.prisma.user.create({
      data: {
        familyId: family.id,
        name: dto.memberName,
        role: dto.role,
      },
    })

    return {
      family: { id: family.id, name: family.name },
      member,
    }
  }

  async findOne(familyId: string) {
    const family = await this.prisma.family.findUnique({
      where: { id: familyId },
      include: {
        members: {
          select: {
            id: true,
            name: true,
            role: true,
            avatar: true,
            createdAt: true,
          },
        },
      },
    })

    if (!family) {
      throw new NotFoundException('家庭不存在')
    }

    return family
  }

  async update(familyId: string, dto: UpdateFamilyDto) {
    const family = await this.prisma.family.findUnique({
      where: { id: familyId },
    })

    if (!family) {
      throw new NotFoundException('家庭不存在')
    }

    return this.prisma.family.update({
      where: { id: familyId },
      data: { ...dto },
      include: { members: true },
    })
  }

  async refreshInviteCode(familyId: string) {
    const family = await this.prisma.family.findUnique({
      where: { id: familyId },
    })

    if (!family) {
      throw new NotFoundException('家庭不存在')
    }

    return this.prisma.family.update({
      where: { id: familyId },
      data: { inviteCode: this.generateInviteCode() },
    })
  }
}
