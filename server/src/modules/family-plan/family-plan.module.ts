import { Module } from '@nestjs/common'
import { PrismaModule } from '../../prisma/prisma.module'
import { FamilyPlanController } from './family-plan.controller'
import { FamilyPlanService } from './family-plan.service'

@Module({
  imports: [PrismaModule],
  controllers: [FamilyPlanController],
  providers: [FamilyPlanService],
})
export class FamilyPlanModule {}
