import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cart, CartDocument } from '../schemas/cart.schema';
import { UserIdRequest, CartDetailsResponse, ClearCartResponse } from '../interfaces/cart.interface';
import { ProductGrpcService } from '../../product/services/product-grpc.service';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class CartGrpcService {
  private readonly logger = new Logger(CartGrpcService.name);

  constructor(
    @InjectModel(Cart.name) private cartModel: Model<CartDocument>,
    private readonly productService: ProductGrpcService,
  ) {}

  async getCartDetails(data: UserIdRequest): Promise<CartDetailsResponse> {
    try {
      this.logger.log(`Getting cart details for user: ${data.userId}`);
      
      const cart = await this.cartModel.findOne({ userId: data.userId }).exec();
      
      if (!cart) {
        this.logger.warn(`No cart found for user: ${data.userId}`);
        return { items: [], totalAmount: 0 };
      }

      const items = await Promise.all(cart.items.map(async item => {
        const product = await this.getProductDetails(item.productId);
        return {
          productId: item.productId,
          quantity: item.quantity,
          color: item.color,
          size: item.size,
          name: product.name,
          price: product.price,
          image: product.imageUrl,
        };
      }));
      const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      return {
        items,
        totalAmount,
      };
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
        { $set: { items: [] } }
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

  private async getProductDetails(productId: string) {
    const response = await lastValueFrom(this.productService.getProduct(productId));
    if (!response || response.code !== 200) {
      throw new Error('Product not found');
    }
    const productData = JSON.parse(response.data);
    if (!productData.price || !productData.name) {
      throw new Error('Incomplete product data');
    }
    return productData;
  }
} 