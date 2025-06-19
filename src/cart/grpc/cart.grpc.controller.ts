import { Controller, Logger, UseGuards } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { UserIdRequest, CartDetailsResponse, ClearCartResponse } from '../interfaces/cart.interface';
import { CartGrpcService } from './cart.grpc.service';
import { GrpcAuthGuard } from '../../middleware/guards/grpc-auth.guard';

@UseGuards(GrpcAuthGuard)
@Controller()
export class CartGrpcController {
  private readonly logger = new Logger(CartGrpcController.name);

  constructor(private readonly cartGrpcService: CartGrpcService) {}

  @GrpcMethod('CartService', 'GetCartDetails')
  async getCartDetails(data: UserIdRequest): Promise<CartDetailsResponse> {
    this.logger.log(`Received GetCartDetails request for user: ${data.userId}`);
    return this.cartGrpcService.getCartDetails(data);
  }

  @GrpcMethod('CartService', 'ClearCart')
  async clearCart(data: UserIdRequest): Promise<ClearCartResponse> {
    this.logger.log(`Received ClearCart request for user: ${data.userId}`);
    return this.cartGrpcService.clearCart(data);
  }
} 