import { Injectable } from '@nestjs/common';
import { CartService } from '../cart.service';
import { Cart } from '../schemas/cart.schema';

@Injectable()
export class CartGrpcService {
  constructor(private readonly cartService: CartService) {}

  async getCart(request: { userId: string }): Promise<Cart> {
    const cart = await this.cartService.getCart(request.userId);
    // Remove image field from each item
    cart.items = cart.items.map(item => {
      const { image, ...itemWithoutImage } = item;
      return itemWithoutImage;
    });
    return cart;
  }

  async clearCart(request: { userId: string }): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      await this.cartService.clearCart(request.userId);
      return {
        success: true,
        message: 'Cart cleared successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to clear cart',
      };
    }
  }
} 