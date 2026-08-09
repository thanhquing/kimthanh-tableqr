import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { ApiExceptionFilter } from './common/api-exception.filter'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  app.setGlobalPrefix('api/v1')
  app.useGlobalFilters(new ApiExceptionFilter())
  app.enableShutdownHooks()
  await app.listen(Number(process.env.PORT ?? 3000))
}
void bootstrap()
