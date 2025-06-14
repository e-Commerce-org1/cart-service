import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cart, CartDocument } from '../schemas/cart.schema';
import { UserIdRequest, CartDetailsResponse, ClearCartResponse } from '../dto/cart.interface';

@Injectable()
export class CartGrpcService {
  private readonly logger = new Logger(CartGrpcService.name);

  constructor(
    @InjectModel(Cart.name) private cartModel: Model<CartDocument>,
  ) {}

  async getCartDetails(data: UserIdRequest): Promise<CartDetailsResponse> {
    try {
      this.logger.log(`Getting cart details for user: ${data.userId}`);
      
      const cart = await this.cartModel.findOne({ userId: data.userId }).exec();
      
      if (!cart) {
        this.logger.warn(`No cart found for user: ${data.userId}`);
        return { items: [] };
      }

      const items = cart.items.map(item => ({
        productId: item.productId,
        description: item.name || '',
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

  async clearCart(data: UserIdRequest): Promise<ClearCartResponse> {
    try {
      this.logger.log(`Clearing cart for user: ${data.userId}`);
      
      const result = await this.cartModel.updateOne(
        { userId: data.userId },
        { $set: { items: [], totalAmount: 0 } }
      ).exec();

      if (result.matchedCount === 0) {
        this.logger.warn(`No cart found for user: ${data.userId}`);
        return { success: false };
      }

      return { success: true };
    } catch (error) {
      this.logger.error(`Error clearing cart: ${error.message}`);
      return { success: false };
    }
  }
} 