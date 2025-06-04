import { NestFactory } from '@nestjs/core';
import { Transport } from '@nestjs/microservices';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  try {
    const app = await NestFactory.createMicroservice(AppModule, {
      transport: Transport.GRPC,
      options: {
        package: 'cart',
        protoPath: join(__dirname, 'proto/cart.proto'),
        url: 'localhost:5000',
      },
    });

    await app.listen();
    console.log('Cart service is running on port 5000');
  } catch (error) {
    console.error('Failed to start cart service:', error);
    process.exit(1);
  }
}

bootstrap();
