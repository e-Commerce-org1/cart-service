import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { MongoExceptionFilter } from './common/filters/mongo-exception.filter';
import { ValidationExceptionFilter } from './common/filters/validation-exception.filter';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

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
      url: configService.get<string>('CART_GRPC_SERVICE'), 
    },
  });

  console.log('gRPC configuration completed');

  try {
   
    await app.startAllMicroservices();
    
    logger.log('gRPC server started on port 7777');
  } catch (error) {
   
    logger.error(`Failed to start gRPC server: ${error.message}`);
    
    process.exit(1);
  }

  const port = configService.get<number>('PORT') || 3002;
  await app.listen(port);
  
}
bootstrap();
