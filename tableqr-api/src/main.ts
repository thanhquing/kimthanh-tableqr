import { NestFactory } from '@nestjs/core'
import { type NestExpressApplication } from '@nestjs/platform-express'
import { join } from 'node:path'
import { AppModule } from './app.module'
import { ApiExceptionFilter } from './common/api-exception.filter'
import { validateRuntimeConfig } from './runtime-config'

async function bootstrap() {
  validateRuntimeConfig()
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true })
  app.setGlobalPrefix('api/v1')
  app.useStaticAssets(process.env.MENU_IMAGE_DIR ?? join(process.cwd(), '../packages/mock/assets'), { prefix: '/menu-images/', maxAge: '30d', immutable: true })
  app.useStaticAssets(process.env.UPLOAD_DIR ?? join(process.cwd(), 'uploads'), { prefix: '/uploads/', maxAge: '30d', immutable: true })
  app.useGlobalFilters(new ApiExceptionFilter())
  app.enableShutdownHooks()
  await app.listen(Number(process.env.PORT ?? 3000))
}
void bootstrap()
