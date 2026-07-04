import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { json, urlencoded } from 'express'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  app.use(json({ limit: '2mb' }))
  app.use(urlencoded({ extended: true, limit: '2mb' }))
  app.enableCors()
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }))
  const port = process.env.PORT || 3001
  await app.listen(port)
  console.log(`[PixelGrow Server] Running on http://localhost:${port}`)
}
bootstrap()
