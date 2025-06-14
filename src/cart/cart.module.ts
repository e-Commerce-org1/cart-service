import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { Cart, CartSchema } from './schemas/cart.schema';
import { AuthService } from '../auth/services/auth.service';
import { AuthGrpcService } from '../auth/services/auth-grpc.service';
import { ProductService } from '../product/services/product.service';
import { ProductGrpcService } from '../product/services/product-grpc.service';
import { CartGrpcService } from './grpc/cart.grpc.service';
import { CartGrpcController } from './grpc/cart.grpc.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Cart.name, schema: CartSchema }]),
    ClientsModule.register([
      {
        name: 'AUTH_PACKAGE',
        transport: Transport.GRPC,
        options: {
          package: 'auth',
          protoPath: join(__dirname, '../../src/proto/auth.proto'),
          url: process.env.AUTH_SERVICE_URL || '0.0.0.0:5052',
        },
      },
      {
        name: 'PRODUCT_PACKAGE',
        transport: Transport.GRPC,
        options: {
          package: 'product',
          protoPath: join(__dirname, '../../src/proto/product.proto'),
          url: process.env.PRODUCT_SERVICE_URL || '0.0.0.0:5001',
        },
      },
    ]),
  ],
  controllers: [CartController, CartGrpcController],
  providers: [CartService, AuthService, AuthGrpcService, ProductService, ProductGrpcService, CartGrpcService],
  exports: [CartService],
})
export class CartModule {} 