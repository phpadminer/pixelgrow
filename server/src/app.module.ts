import { Module } from '@nestjs/common'
import { PrismaModule } from './prisma/prisma.module'
import { UserModule } from './modules/user/user.module'
import { FamilyModule } from './modules/family/family.module'
import { CharacterModule } from './modules/character/character.module'
import { TaskModule } from './modules/task/task.module'
import { HomeModule } from './modules/home/home.module'
import { WorldModule } from './modules/world/world.module'
import { FamilyPlanModule } from './modules/family-plan/family-plan.module'

@Module({
  imports: [
    PrismaModule,
    UserModule,
    FamilyModule,
    CharacterModule,
    TaskModule,
    HomeModule,
    WorldModule,
    FamilyPlanModule,
  ],
})
export class AppModule {}
