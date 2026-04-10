import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import {
  CreateFamilyDto,
  JoinFamilyDto,
  UpdateFamilyDto,
} from './family.dto'
import * as crypto from 'crypto'

// In-memory invite code store (use Redis in production)
const inviteCodeStore = new Map<string, { familyId: string; expiresAt: number }>()

@Injectable()
export class FamilyService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateFamilyDto) {
    const creator = await this.prisma.user.findUnique({
      where: { id: dto.creatorId },
    })
    if (!creator) {
      throw new NotFoundException('Creator user not found')
    }

    const family = await this.prisma.family.create({
      data: { name: dto.name },
    })

    // Move creator into this family as PARENT
    await this.prisma.user.update({
      where: { id: dto.creatorId },
      data: { familyId: family.id, role: 'PARENT' },
    })

    return this.prisma.family.findUnique({
      where: { id: family.id },
      include: { members: true },
    })
  }

  async findById(id: string) {
    const family = await this.prisma.family.findUnique({
      where: { id },
      include: { members: true, tasks: { take: 10, orderBy: { createdAt: 'desc' } } },
    })
    if (!family) {
      throw new NotFoundException('Family not found')
    }
    return family
  }

  async update(id: string, dto: UpdateFamilyDto) {
    const family = await this.prisma.family.findUnique({ where: { id } })
    if (!family) {
      throw new NotFoundException('Family not found')
    }

    return this.prisma.family.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
      },
    })
  }

  async generateInviteCode(familyId: string): Promise<{ code: string; expiresAt: Date }> {
    const family = await this.prisma.family.findUnique({ where: { id: familyId } })
    if (!family) {
      throw new NotFoundException('Family not found')
    }

    // Use try/catch to handle potential collision instead of TOCTOU check-then-set
    const maxRetries = 5
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const code = crypto.randomBytes(4).toString('hex').toUpperCase()
        const expiresAt = Date.now() + 24 * 60 * 60 * 1000 // 24 hours

        // Check if code already exists
        if (inviteCodeStore.has(code)) {
          continue // Collision, retry
        }

        inviteCodeStore.set(code, { familyId, expiresAt })

        return {
          code,
          expiresAt: new Date(expiresAt),
        }
      } catch {
        if (attempt === maxRetries - 1) {
          throw new BadRequestException('Failed to generate invite code, please try again')
        }
      }
    }

    throw new BadRequestException('Failed to generate invite code after retries')
  }

  async joinByInviteCode(dto: JoinFamilyDto) {
    const codeEntry = inviteCodeStore.get(dto.inviteCode)
    if (!codeEntry) {
      throw new BadRequestException('Invalid invite code')
    }

    if (Date.now() > codeEntry.expiresAt) {
      inviteCodeStore.delete(dto.inviteCode)
      throw new BadRequestException('Invite code has expired')
    }

    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    })
    if (!user) {
      throw new NotFoundException('User not found')
    }

    // Check for duplicate join - user already in this family
    if (user.familyId === codeEntry.familyId) {
      throw new ConflictException('User is already a member of this family')
    }

    // Move user to the new family
    const updatedUser = await this.prisma.user.update({
      where: { id: dto.userId },
      data: { familyId: codeEntry.familyId },
      include: { family: true },
    })

    // Clean up used invite code
    inviteCodeStore.delete(dto.inviteCode)

    return updatedUser
  }

  async getMembers(familyId: string) {
    const family = await this.prisma.family.findUnique({
      where: { id: familyId },
      include: {
        members: {
          include: { character: true },
        },
      },
    })
    if (!family) {
      throw new NotFoundException('Family not found')
    }
    return family.members
  }
}
