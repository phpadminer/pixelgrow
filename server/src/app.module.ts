import { Module } from '@nestjs/common'
import { PrismaModule } from './prisma/prisma.module'
import { CharacterModule } from './character/character.module'

@Module({
  imports: [
    PrismaModule,
    CharacterModule,
    // TODO: Add feature modules
    // UserModule,
    // FamilyModule,
    // TaskModule,
    // WorldModule,
    // KnowledgeModule,
    // SocialModule,
    // AchievementModule,
    // MapModule,
    // CreativeModule,
  ],
})
export class AppModule {}
