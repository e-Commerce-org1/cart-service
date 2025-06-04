import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { CartService } from './cart.service';
import {
  AddItemRequest,
  RemoveItemRequest,
  UpdateItemRequest,
  GetCartRequest,
  ClearCartRequest,
} from '../interfaces/cart-request.interface';
import { Cart, CartItem, CartResponse } from '../interfaces/cart.interface';

@Controller()
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @GrpcMethod('CartService', 'AddItem')
  async addItem(data: { userId: string; item: CartItem }): Promise<Cart> {
    const response = await this.cartService.addItem(data.userId, data.item);
    if (!response.success || !response.cart) {
      throw new Error(response.message);
    }
    return response.cart;
  }

  @GrpcMethod('CartService', 'RemoveItem')
  async removeItem(data: { userId: string; productId: string }): Promise<Cart> {
    const response = await this.cartService.removeItem(data.userId, data.productId);
    if (!response.success || !response.cart) {
      throw new Error(response.message);
    }
    return response.cart;
  }

  @GrpcMethod('CartService', 'UpdateItem')
  async updateItem(data: {
    userId: string;
    productId: string;
    quantity: number;
  }): Promise<Cart> {
    const response = await this.cartService.updateItem(
      data.userId,
      data.productId,
      data.quantity,
    );
    if (!response.success || !response.cart) {
      throw new Error(response.message);
    }
    return response.cart;
  }

  @GrpcMethod('CartService', 'GetCart')
  async getCart(data: { userId: string }): Promise<Cart> {
    const response = await this.cartService.getCart(data.userId);
    if (!response.success || !response.cart) {
      throw new Error(response.message);
    }
    return response.cart;
  }

  @GrpcMethod('CartService', 'ClearCart')
  async clearCart(data: { userId: string }): Promise<Cart> {
    const response = await this.cartService.clearCart(data.userId);
    if (!response.success) {
      throw new Error(response.message);
    }
    // Return an empty cart when clearing
    return {
      userId: data.userId,
      items: [],
      totalAmount: 0,
    };
  }
} 