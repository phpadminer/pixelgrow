import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'
import {
  CreateWorldDto,
  CreateRegionDto,
  UpdateRegionDto,
  BuildingDto,
} from './world.dto'

type DefaultRegionSeed = {
  name: string
  fantasyName: string
  type: string
  unlocked: boolean
}

const DEFAULT_REGIONS: DefaultRegionSeed[] = [
  { name: '家', fantasyName: '冒险者城堡', type: 'home', unlocked: true },
  { name: '学校', fantasyName: '智慧学院', type: 'school', unlocked: false },
  { name: '公园', fantasyName: '精灵森林', type: 'park', unlocked: false },
  { name: '超市', fantasyName: '炼金商店', type: 'market', unlocked: false },
]

@Injectable()
export class WorldService {
  constructor(private readonly prisma: PrismaService) {}

  async getByFamily(familyId: string) {
    const world = await this.prisma.world.findUnique({
      where: { familyId },
      include: { regions: { orderBy: { createdAt: 'asc' } } },
    })
    if (!world) {
      throw new NotFoundException('World not found for this family')
    }
    return world
  }

  async create(dto: CreateWorldDto) {
    const family = await this.prisma.family.findUnique({
      where: { id: dto.familyId },
    })
    if (!family) {
      throw new NotFoundException('Family not found')
    }

    const existing = await this.prisma.world.findUnique({
      where: { familyId: dto.familyId },
    })
    if (existing) {
      throw new ConflictException('World already exists for this family')
    }

    const unlockedCount = DEFAULT_REGIONS.filter((r) => r.unlocked).length
    const explorationRate = (unlockedCount / DEFAULT_REGIONS.length) * 100

    const world = await this.prisma.world.create({
      data: {
        familyId: dto.familyId,
        explorationRate,
        regions: {
          create: DEFAULT_REGIONS.map((r) => ({
            name: r.name,
            fantasyName: r.fantasyName,
            type: r.type,
            unlocked: r.unlocked,
          })),
        },
      },
      include: { regions: { orderBy: { createdAt: 'asc' } } },
    })

    return world
  }

  async listRegions(worldId: string) {
    await this.ensureWorldExists(worldId)
    return this.prisma.worldRegion.findMany({
      where: { worldId },
      orderBy: { createdAt: 'asc' },
    })
  }

  async addRegion(worldId: string, dto: CreateRegionDto) {
    await this.ensureWorldExists(worldId)

    const region = await this.prisma.worldRegion.create({
      data: {
        worldId,
        name: dto.name,
        fantasyName: dto.fantasyName,
        type: dto.type,
        unlocked: dto.unlocked ?? false,
        realLocation: (dto.realLocation ?? undefined) as Prisma.InputJsonValue | undefined,
        buildings: (dto.buildings ?? []) as Prisma.InputJsonValue,
        npcs: (dto.npcs ?? []) as Prisma.InputJsonValue,
      },
    })

    await this.recalculateExploration(worldId)
    return region
  }

  async unlockRegion(worldId: string, regionId: string) {
    const region = await this.findRegion(worldId, regionId)
    if (region.unlocked) {
      return region
    }
    const updated = await this.prisma.worldRegion.update({
      where: { id: regionId },
      data: { unlocked: true },
    })
    await this.recalculateExploration(worldId)
    return updated
  }

  async updateRegion(
    worldId: string,
    regionId: string,
    dto: UpdateRegionDto,
  ) {
    await this.findRegion(worldId, regionId)

    return this.prisma.worldRegion.update({
      where: { id: regionId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.fantasyName !== undefined && { fantasyName: dto.fantasyName }),
        ...(dto.buildings !== undefined && {
          buildings: dto.buildings as Prisma.InputJsonValue,
        }),
        ...(dto.npcs !== undefined && {
          npcs: dto.npcs as Prisma.InputJsonValue,
        }),
      },
    })
  }

  async addBuilding(worldId: string, regionId: string, building: BuildingDto) {
    const region = await this.findRegion(worldId, regionId)

    const current = Array.isArray(region.buildings)
      ? (region.buildings as unknown[])
      : []
    const next = [...current, building as unknown]

    return this.prisma.worldRegion.update({
      where: { id: regionId },
      data: { buildings: next as Prisma.InputJsonValue },
    })
  }

  async getExploration(worldId: string) {
    const world = await this.prisma.world.findUnique({
      where: { id: worldId },
      include: { regions: true },
    })
    if (!world) {
      throw new NotFoundException('World not found')
    }

    const total = world.regions.length
    const unlocked = world.regions.filter((r) => r.unlocked).length
    const rate = total === 0 ? 0 : (unlocked / total) * 100

    return {
      worldId: world.id,
      totalRegions: total,
      unlockedRegions: unlocked,
      lockedRegions: total - unlocked,
      explorationRate: Number(rate.toFixed(2)),
      regions: world.regions.map((r) => ({
        id: r.id,
        name: r.name,
        fantasyName: r.fantasyName,
        type: r.type,
        unlocked: r.unlocked,
      })),
    }
  }

  private async ensureWorldExists(worldId: string) {
    const world = await this.prisma.world.findUnique({ where: { id: worldId } })
    if (!world) {
      throw new NotFoundException('World not found')
    }
    return world
  }

  private async findRegion(worldId: string, regionId: string) {
    const region = await this.prisma.worldRegion.findUnique({
      where: { id: regionId },
    })
    if (!region || region.worldId !== worldId) {
      throw new NotFoundException('Region not found in this world')
    }
    return region
  }

  private async recalculateExploration(worldId: string) {
    const regions = await this.prisma.worldRegion.findMany({
      where: { worldId },
      select: { unlocked: true },
    })
    const total = regions.length
    const unlocked = regions.filter((r) => r.unlocked).length
    const rate = total === 0 ? 0 : (unlocked / total) * 100

    await this.prisma.world.update({
      where: { id: worldId },
      data: { explorationRate: Number(rate.toFixed(2)) },
    })
  }
}
