import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { PrismaModule } from './prisma/prisma.module'
import { AuthModule } from './auth/auth.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
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
