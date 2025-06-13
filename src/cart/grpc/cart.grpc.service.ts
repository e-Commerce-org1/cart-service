import { Controller, Injectable, Logger } from '@nestjs/common';
import { CartService } from '../cart.service';
import { GrpcMethod } from '@nestjs/microservices';
import { UserIdRequest, CartDetailsResponse, ClearCartResponse } from '../dto/cart.interface';

@Controller()
export class CartGrpcService {
  private readonly logger = new Logger(CartGrpcService.name);

  constructor(private readonly cartService: CartService) {}

  @GrpcMethod('CartService', 'GetCartDetails')
  async getCartDetails(data: UserIdRequest): Promise<CartDetailsResponse> {
    try {
      const cart = await this.cartService.getCartDetails(data.userId);
      
      const items = cart.items.map(item => ({
        productId: item.productId,
        description: item.name, 
        color: item.color || '', 
        size: item.size || '', 
        quantity: item.quantity,
        price: Math.round(item.price) 
      }));

      return { items };
    } catch (error) {
      this.logger.error(`Error getting cart details: ${error.message}`);
      throw error;
    }
  }

  @GrpcMethod('CartService', 'ClearCart')
  async clearCart(data: UserIdRequest): Promise<ClearCartResponse> {
    try {
      await this.cartService.clearCart(data.userId);
      return { success: true };
    } catch (error) {
      this.logger.error(`Error clearing cart: ${error.message}`);
      return { success: false };
    }
  }
} 