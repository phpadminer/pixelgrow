import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class FamilyService {
  constructor(private prisma: PrismaService) {}

  private generateInviteCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let code = ''
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  }

  async create(name: string) {
    let inviteCode: string
    // Ensure uniqueness
    for (let attempt = 0; attempt < 10; attempt++) {
      inviteCode = this.generateInviteCode()
      const existing = await this.prisma.family.findUnique({ where: { inviteCode } })
      if (!existing) {
        return this.prisma.family.create({
          data: { name, inviteCode },
          include: { members: true },
        })
      }
    }
    throw new BadRequestException('Failed to generate unique invite code, please try again')
  }

  async join(userId: string, inviteCode: string) {
    const family = await this.prisma.family.findUnique({
      where: { inviteCode },
    })
    if (!family) {
      throw new NotFoundException('Invalid invite code')
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { familyId: family.id },
      include: { family: { include: { members: true } } },
    })
  }

  async findById(familyId: string) {
    const family = await this.prisma.family.findUnique({
      where: { id: familyId },
      include: { members: true },
    })
    if (!family) {
      throw new NotFoundException('Family not found')
    }
    return family
  }

  async update(familyId: string, data: { name?: string }) {
    return this.prisma.family.update({
      where: { id: familyId },
      data,
      include: { members: true },
    })
  }
}
