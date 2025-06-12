import { Injectable, Logger } from '@nestjs/common';
import { CartService } from '../cart.service';
import { GrpcMethod } from '@nestjs/microservices';

@Injectable()
export class CartGrpcService {
  private readonly logger = new Logger(CartGrpcService.name);

  constructor(private readonly cartService: CartService) {}

  @GrpcMethod('CartService', 'GetCartDetails')
  async getCartDetails(data: { userId: string }) {
    try {
      const cart = await this.cartService.getCart(data.userId);
      
      // Transform cart items to match CartItem format
      const items = cart.items.map(item => ({
        productId: item.productId,
        description: item.name, // Using name as description
        color: '', // Default empty as we don't have color
        size: '', // Default empty as we don't have size
        quantity: item.quantity,
        price: Math.round(item.price) // Convert to int32
      }));

      return { items };
    } catch (error) {
      this.logger.error(`Error getting cart details: ${error.message}`);
      throw error;
    }
  }

  @GrpcMethod('CartService', 'ClearCart')
  async clearCart(data: { userId: string }) {
    try {
      await this.cartService.clearCart(data.userId);
      return { success: true };
    } catch (error) {
      this.logger.error(`Error clearing cart: ${error.message}`);
      return { success: false };
    }
  }
} 