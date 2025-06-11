import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cart, CartDocument } from './schemas/cart.schema';
import { ERROR_MESSAGES } from '../common/constants/error-messages';
import { AddItemDto } from './dto/add-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { lastValueFrom } from 'rxjs';
import { AuthService } from '../auth/services/auth.service';
import { ProductService } from '../product/services/product.service';
import { CustomLogger } from '../common/services/logger.service';

@Injectable()
export class CartService {
  private readonly logger = new CustomLogger(CartService.name);

  constructor(
    @InjectModel(Cart.name) private cartModel: Model<CartDocument>,
    private authService: AuthService,
    private productService: ProductService,
  ) {
    this.logger.log('CartService initialized');
  }

  async validateAccessToken(token: string): Promise<{
    isValid: boolean;
    message?: string;
    entityId: string;
    email?: string;
    deviceId?: string;
    role?: string;
  }> {
    try {
      this.logger.debug('Validating access token');
      const response = await lastValueFrom(this.authService.validateToken({ accessToken: token }));
      this.logger.debug(`Token validation result: ${JSON.stringify(response)}`);
      return response;
    } catch (error) {
      this.logger.error(`Token validation error: ${error.message}`, error.stack);
      return {
        isValid: false,
        message: 'Invalid token',
        entityId: '',
      };
    }
  }

  async getCart(userId: string): Promise<Cart> {
    try {
      this.logger.debug(`Getting cart for user: ${userId}`);
      if (!userId) {
        throw new BadRequestException('User ID is required');
      }

      const cart = await this.cartModel.findOne({ userId });
      if (!cart) {
        this.logger.warn(`Cart not found for user: ${userId}`);
        throw new NotFoundException(ERROR_MESSAGES.CART.NOT_FOUND);
      }
      this.logger.debug(`Cart retrieved successfully for user: ${userId}`);
      return cart;
    } catch (error) {
      this.logger.error(`Error getting cart for user ${userId}: ${error.message}`, error.stack);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to retrieve cart');
    }
  }

  async addItem(userId: string, addItemDto: AddItemDto): Promise<Cart> {
    try {
      this.logger.debug(`Adding item to cart for user: ${userId}, product: ${addItemDto.productId}`);
      if (!userId) {
        throw new BadRequestException('User ID is required');
      }

      if (!addItemDto.productId) {
        throw new BadRequestException('Product ID is required');
      }

      // Get product details from product service
      this.logger.debug(`Fetching product details for productId: ${addItemDto.productId}`);
      let productResponse;
      try {
        productResponse = await lastValueFrom(this.productService.getProduct(addItemDto.productId));
        this.logger.debug(`Product service response: ${JSON.stringify(productResponse)}`);
      } catch (error) {
        this.logger.error(`Product service error: ${error.message}`, error.stack);
        throw new BadRequestException('Failed to fetch product details');
      }

      if (!productResponse || productResponse.code !== 200) {
        this.logger.error(`Invalid product response: ${JSON.stringify(productResponse)}`);
        throw new BadRequestException('Product not found or invalid');
      }

      let productData;
      try {
        productData = JSON.parse(productResponse.data);
        this.logger.debug(`Parsed product data: ${JSON.stringify(productData)}`);
      } catch (error) {
        this.logger.error(`Failed to parse product data: ${error.message}`, error.stack);
        throw new BadRequestException('Invalid product data format');
      }

      if (!productData.price || !productData.name) {
        this.logger.error('Product data is incomplete');
        throw new BadRequestException('Product data is incomplete');
      }
      
      let cart;
      try {
        cart = await this.cartModel.findOne({ userId });
      } catch (error) {
        this.logger.error(`Database error while finding cart: ${error.message}`, error.stack);
        throw new InternalServerErrorException('Failed to access cart');
      }
      
      if (!cart) {
        this.logger.debug(`Creating new cart for user: ${userId}`);
        cart = new this.cartModel({ userId, items: [], totalAmount: 0 });
      }

      const existingItemIndex = cart.items.findIndex(
        (i) => i.productId === addItemDto.productId,
      );

      if (existingItemIndex > -1) {
        this.logger.debug(`Updating quantity for existing item in cart: ${addItemDto.productId}`);
        cart.items[existingItemIndex].quantity += 1;
      } else {
        this.logger.debug(`Adding new item to cart: ${addItemDto.productId}`);
        cart.items.push({
          productId: addItemDto.productId,
          quantity: 1,
          price: productData.price,
          name: productData.name,
          image: productData.imageUrl || ''
        });
      }

      cart.totalAmount = this.calculateTotal(cart.items);
      
      try {
        const savedCart = await cart.save();
        this.logger.debug(`Cart updated successfully for user: ${userId}`);
        return savedCart;
      } catch (error) {
        this.logger.error(`Failed to save cart: ${error.message}`, error.stack);
        throw new InternalServerErrorException('Failed to update cart');
      }
    } catch (error) {
      this.logger.error(`Error adding item to cart for user ${userId}: ${error.message}`, error.stack);
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to add item to cart');
    }
  }

  async updateItem(userId: string, productId: string, quantity: number): Promise<Cart> {
    try {
      this.logger.debug(`Updating item quantity for user: ${userId}, product: ${productId}, quantity: ${quantity}`);
      if (!userId) {
        throw new BadRequestException('User ID is required');
      }

      if (!productId) {
        throw new BadRequestException('Product ID is required');
      }

      if (quantity < 1) {
        throw new BadRequestException('Quantity must be at least 1');
      }

      // Validate product exists
      let productResponse;
      try {
        productResponse = await lastValueFrom(this.productService.getProduct(productId));
      } catch (error) {
        this.logger.error(`Product service error: ${error.message}`, error.stack);
        throw new BadRequestException('Failed to fetch product details');
      }

      if (!productResponse || productResponse.code !== 200) {
        this.logger.error(`Invalid product response: ${JSON.stringify(productResponse)}`);
        throw new BadRequestException('Product not found or invalid');
      }

      let cart;
      try {
        cart = await this.cartModel.findOne({ userId });
      } catch (error) {
        this.logger.error(`Database error while finding cart: ${error.message}`, error.stack);
        throw new InternalServerErrorException('Failed to access cart');
      }

      if (!cart) {
        this.logger.warn(`Cart not found for user: ${userId}`);
        throw new NotFoundException(ERROR_MESSAGES.CART.NOT_FOUND);
      }

      const itemIndex = cart.items.findIndex(
        (item) => item.productId === productId,
      );

      if (itemIndex === -1) {
        this.logger.warn(`Item not found in cart: ${productId}`);
        throw new NotFoundException(ERROR_MESSAGES.CART.ITEM_NOT_FOUND);
      }

      cart.items[itemIndex].quantity = quantity;
      cart.totalAmount = this.calculateTotal(cart.items);
      
      try {
        const updatedCart = await cart.save();
        this.logger.debug(`Cart updated successfully for user: ${userId}`);
        return updatedCart;
      } catch (error) {
        this.logger.error(`Failed to save cart: ${error.message}`, error.stack);
        throw new InternalServerErrorException('Failed to update cart');
      }
    } catch (error) {
      this.logger.error(`Error updating item in cart for user ${userId}: ${error.message}`, error.stack);
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to update cart item');
    }
  }

  async removeItem(userId: string, productId: string): Promise<Cart> {
    try {
      this.logger.debug(`Removing item from cart for user: ${userId}, product: ${productId}`);
      if (!userId) {
        throw new BadRequestException('User ID is required');
      }

      if (!productId) {
        throw new BadRequestException('Product ID is required');
      }

      let cart;
      try {
        cart = await this.cartModel.findOne({ userId });
      } catch (error) {
        this.logger.error(`Database error while finding cart: ${error.message}`, error.stack);
        throw new InternalServerErrorException('Failed to access cart');
      }

      if (!cart) {
        this.logger.warn(`Cart not found for user: ${userId}`);
        throw new NotFoundException(ERROR_MESSAGES.CART.NOT_FOUND);
      }

      cart.items = cart.items.filter((item) => item.productId !== productId);
      cart.totalAmount = this.calculateTotal(cart.items);
      
      try {
        const updatedCart = await cart.save();
        this.logger.debug(`Item removed successfully from cart for user: ${userId}`);
        return updatedCart;
      } catch (error) {
        this.logger.error(`Failed to save cart: ${error.message}`, error.stack);
        throw new InternalServerErrorException('Failed to update cart');
      }
    } catch (error) {
      this.logger.error(`Error removing item from cart for user ${userId}: ${error.message}`, error.stack);
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to remove item from cart');
    }
  }

  async clearCart(userId: string): Promise<Cart> {
    try {
      this.logger.debug(`Clearing cart for user: ${userId}`);
      if (!userId) {
        throw new BadRequestException('User ID is required');
      }

      let cart;
      try {
        cart = await this.cartModel.findOne({ userId });
      } catch (error) {
        this.logger.error(`Database error while finding cart: ${error.message}`, error.stack);
        throw new InternalServerErrorException('Failed to access cart');
      }

      if (!cart) {
        this.logger.warn(`Cart not found for user: ${userId}`);
        throw new NotFoundException(ERROR_MESSAGES.CART.NOT_FOUND);
      }

      cart.items = [];
      cart.totalAmount = 0;
      
      try {
        const clearedCart = await cart.save();
        this.logger.debug(`Cart cleared successfully for user: ${userId}`);
        return clearedCart;
      } catch (error) {
        this.logger.error(`Failed to save cart: ${error.message}`, error.stack);
        throw new InternalServerErrorException('Failed to clear cart');
      }
    } catch (error) {
      this.logger.error(`Error clearing cart for user ${userId}: ${error.message}`, error.stack);
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to clear cart');
    }
  }

  private calculateTotal(items: any[]): number {
    try {
      const total = items.reduce((total, item) => total + (item.price * item.quantity), 0);
      this.logger.debug(`Calculated total: ${total}`);
      return total;
    } catch (error) {
      this.logger.error(`Error calculating total: ${error.message}`, error.stack);
      return 0;
    }
  }
} 