import { Module } from '@nestjs/common'
import { PrismaModule } from './prisma/prisma.module'
import { TaskModule } from './modules/task/task.module'

@Module({
  imports: [
    PrismaModule,
    TaskModule,
    // TODO: Add more feature modules
    // UserModule,
    // FamilyModule,
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
