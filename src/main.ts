import { NestFactory } from '@nestjs/core'
import { ValidationPipe, Logger } from '@nestjs/common'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import { AppModule } from './app.module'
import { ConfigService } from '@nestjs/config'


async function bootstrap() {
  const logger = new Logger('Bootstrap')
  const app = await NestFactory.create(AppModule)


  const configService = app.get(ConfigService)

  // Enable CORS - IMPORTANT for frontend connection
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://192.168.1.25:3000',
      configService.get('cors.origin')
    ],
    credential: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  })

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      }
    })
  )

  //API PREFIX
  app.setGlobalPrefix('api')

  //Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Cleaning Services API')
    .setDescription('API for managing home cleaning service bookings')
    .setVersion('1.0')
    .addTag('bookings')
    .build()
  
  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup('api/docs', app, document)

  const port = configService.get('PORT')
  await app.listen(port)

  logger.log(`Application is running on: http://localhost:${port}`)
  logger.log(`Swagger docs available at: http://localhost:${port}/api/docs`)
  logger.log(`Accepting requests from: http://localhost:3000`)
}

bootstrap();
