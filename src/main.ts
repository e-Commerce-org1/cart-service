import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Logger } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors();

  // Enable validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('Cart Microservice API')
    .setDescription(`
      The Cart Microservice API provides endpoints for managing shopping carts.
      
      ## Features
      - Get cart details
      - Add items to cart
      - Update item quantities
      - Remove items from cart
      - Clear cart
      
      ## Authentication
      All endpoints require a valid JWT token in the Authorization header.
      Format: \`Bearer <token>\`
    `)
    .setVersion('1.0')
    .addTag('cart', 'Cart management endpoints')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
    customSiteTitle: 'Cart Microservice API Documentation',
  });

  // Start gRPC server
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'cart',
      protoPath: join(__dirname, '../src/proto/cart.proto'),
      url: '0.0.0.0:5000', // Cart service will listen on port 5000
    },
  });

  await app.startAllMicroservices();
  logger.log('gRPC server started on port 5000');

  // Start HTTP server
  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`HTTP server started on port ${port}`);
  console.log(`Swagger documentation is available at: http://localhost:${port}/api`);
}
bootstrap();
