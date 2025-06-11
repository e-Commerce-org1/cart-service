import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { CustomLogger } from './common/services/logger.service';

async function bootstrap() {
  const logger = new CustomLogger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    logger: new CustomLogger(),
  });

  // Enable CORS
  app.enableCors();
  logger.log('CORS enabled');

  // Enable validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  logger.log('Validation pipe enabled');

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
  logger.log('Swagger documentation enabled');

  // gRPC server setup
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'cart',
      protoPath: join(__dirname, '../src/proto/cart.proto'),
      url: 'localhost:5000', 
    },
  });
  logger.log('gRPC server configured');

  // Start all microservices
  await app.startAllMicroservices();
  logger.log('All microservices started');

  // Start HTTP server
  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`Application is running on: ${await app.getUrl()}`);
  logger.log(`Swagger documentation is available at: ${await app.getUrl()}/api`);
}
bootstrap();
