import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const allowedOrigins = new Set<string>([
    'http://localhost:3001',
    'http://127.0.0.1:3001',
    'https://vaultid-frontend.onrender.com',
  ]);

  const corsOptions: CorsOptions = {
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS blocked for origin: ${origin}`), false);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false,
  };

  app.enableCors(corsOptions);

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap().catch((err) => {
  console.error('Bootstrap failed', err);
  process.exit(1);
});
