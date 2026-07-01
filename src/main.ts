import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const corsOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  // Activamos las validaciones globales
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Elimina campos que no esten en el DTO
      forbidNonWhitelisted: true, // Lanza error si hay campos no permitidos
      transform: true, // Convierte tipos automaticamente
    }),
  );

  // Configuracion de CORS
  app.enableCors({
    origin:
      corsOrigins.length === 0
        ? true
        : (origin, callback) => {
            if (!origin || corsOrigins.includes(origin)) {
              return callback(null, true);
            }

            return callback(new Error('Origin not allowed by CORS'), false);
          },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
