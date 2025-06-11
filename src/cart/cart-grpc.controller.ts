import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { CartService } from './cart.service';

@Controller()
export class CartGrpcController {
  constructor(private readonly cartService: CartService) {}

  @GrpcMethod('CartService', 'GetCart')
  async getCart(data: { userId: string }) {
    return this.cartService.getCart(data.userId);
  }

  @GrpcMethod('CartService', 'ClearCart')
  async clearCart(data: { userId: string }) {
    try {
      await this.cartService.clearCart(data.userId);
      return {
        success: true,
        message: 'Cart cleared successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to clear cart'
      };
    }
  }
} 