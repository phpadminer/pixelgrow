import { Module } from '@nestjs/common'
import { PrismaModule } from './prisma/prisma.module'
import { FamilyModule } from './family/family.module'

@Module({
  imports: [
    PrismaModule,
    FamilyModule,
    // TODO: Add feature modules
    // UserModule,
    // TaskModule,
    // CharacterModule,
    // WorldModule,
    // KnowledgeModule,
    // SocialModule,
    // AchievementModule,
    // MapModule,
    // CreativeModule,
  ],
})
export class AppModule {}
