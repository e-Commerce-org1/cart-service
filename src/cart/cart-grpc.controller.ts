import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { CartService } from './cart.service';

@Controller()
export class CartGrpcController {
  constructor(private readonly cartService: CartService) {}

  @GrpcMethod('CartService', 'GetCart')
  async getCart(data: { userId: string }) {
    try {
      const cart = await this.cartService.getCart(data.userId);
      return {
        userId: cart.userId,
        items: cart.items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          name: item.name
        })),
        totalAmount: cart.totalAmount
      };
    } catch (error) {
      return {
        userId: data.userId,
        items: [],
        totalAmount: 0
      };
    }
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