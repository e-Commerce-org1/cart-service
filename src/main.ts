import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { MongoExceptionFilter } from './common/filters/mongo-exception.filter';
import { ValidationExceptionFilter } from './common/filters/validation-exception.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  app.enableCors();

  app.useGlobalFilters(
    new HttpExceptionFilter(),
    new MongoExceptionFilter(),
    new ValidationExceptionFilter()
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );


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


  logger.log('Attempting to connect gRPC microservice...');
  console.log(' Starting gRPC server configuration...');
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'cart',
      protoPath: join(__dirname, '../src/proto/cart.proto'),
      url: '0.0.0.0:6666', 
    },
  });

  console.log('gRPC configuration completed');

  try {
    console.log('Starting all microservices...');
    await app.startAllMicroservices();
    console.log('gRPC server successfully started on port 7777');
    logger.log('gRPC server started on port 7777');
  } catch (error) {
    console.error(' ERROR: Failed to start gRPC server');
    logger.error(`Failed to start gRPC server: ${error.message}`);
    console.error('Full error:', error);
    process.exit(1);
  }

  // Start HTTP server
  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`HTTP server started on port ${port}`);
  console.log(`Swagger documentation is available at: http://localhost:${port}/api`);
}
bootstrap();
