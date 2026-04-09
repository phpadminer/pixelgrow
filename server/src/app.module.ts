import { Module } from '@nestjs/common'
import { PrismaModule } from './prisma/prisma.module'
import { TaskModule } from './task/task.module'

@Module({
  imports: [
    PrismaModule,
    TaskModule,
    // TODO: Add feature modules
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
