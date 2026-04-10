import { Module } from '@nestjs/common'
import { PrismaModule } from './prisma/prisma.module'
import { UserModule } from './modules/user/user.module'

@Module({
  imports: [
    PrismaModule,
    UserModule,
    // TODO: Add feature modules
    // FamilyModule,
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
