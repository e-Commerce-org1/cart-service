import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cart, CartDocument } from './schemas/cart.schema';
import { ERROR_MESSAGES } from '../common/constants/error-messages';
import { Logger } from '@nestjs/common';
import { AddItemDto } from './dto/add-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { lastValueFrom } from 'rxjs';
import { AuthService } from '../auth/services/auth.service';
import { ProductService } from '../product/services/product.service';

@Injectable()
export class CartService {
  private readonly logger = new Logger(CartService.name);

  constructor(
    @InjectModel(Cart.name) private cartModel: Model<CartDocument>,
    private authService: AuthService,
    private productService: ProductService,
  ) {}

  async validateAccessToken(token: string): Promise<{
    isValid: boolean;
    message?: string;
    entityId: string;
    email?: string;
    deviceId?: string;
    role?: string;
  }> {
    try {
      const response = await lastValueFrom(this.authService.validateToken({ accessToken: token }));
      this.logger.debug(`Token validation result: ${JSON.stringify(response)}`);
      return response;
    } catch (error) {
      this.logger.error(`Token validation error: ${error.message}`);
      return {
        isValid: false,
        message: 'Invalid token',
        entityId: '',
      };
    }
  }

  async getCart(userId: string): Promise<Cart> {
    this.logger.debug(`Getting cart for user: ${userId}`);
    const cart = await this.cartModel.findOne({ userId }).exec();
    if (!cart) {
      this.logger.warn(`Cart not found for user: ${userId}`);
      throw new NotFoundException('Cart not found');
    }
    return cart;
  }

  async addItem(userId: string, addItemDto: AddItemDto): Promise<Cart> {
    this.logger.debug(`Adding item to cart for user: ${userId}`, addItemDto);

    try {
      // Check if product exists and has enough stock
      const product = await lastValueFrom(this.productService.getProduct(addItemDto.productId));
      
      if (!product) {
        this.logger.warn(`Product not found: ${addItemDto.productId}`);
        throw new BadRequestException('Product not found');
      }

      if (product.stock < addItemDto.quantity) {
        this.logger.warn(`Insufficient stock for product: ${addItemDto.productId}`);
        throw new BadRequestException(`Insufficient stock. Available: ${product.stock}`);
      }

      let cart = await this.cartModel.findOne({ userId }).exec();

      if (!cart) {
        this.logger.debug(`Creating new cart for user: ${userId}`);
        cart = new this.cartModel({
          userId,
          items: [],
          totalAmount: 0,
        });
      }

      const existingItemIndex = cart.items.findIndex(
        item => item.productId === addItemDto.productId
      );

      if (existingItemIndex > -1) {
        // Check if updated quantity exceeds stock
        const newQuantity = cart.items[existingItemIndex].quantity + addItemDto.quantity;
        if (newQuantity > product.stock) {
          this.logger.warn(`Insufficient stock for product: ${addItemDto.productId}`);
          throw new BadRequestException(`Insufficient stock. Available: ${product.stock}`);
        }
        
        cart.items[existingItemIndex].quantity = newQuantity;
      } else {
        cart.items.push({
          productId: addItemDto.productId,
          quantity: addItemDto.quantity,
          price: product.price,
          name: product.name,
          image: product.image,
        });
      }

      // Recalculate total amount
      cart.totalAmount = cart.items.reduce(
        (total, item) => total + item.price * item.quantity,
        0
      );

      const savedCart = await cart.save();
      this.logger.debug(`Item added to cart successfully for user: ${userId}`);
      return savedCart;
    } catch (error) {
      this.logger.error(`Error adding item to cart: ${error.message}`, error.stack);
      throw error;
    }
  }

  async updateItem(userId: string, productId: string, quantity: number): Promise<Cart> {
    this.logger.debug(`Updating item quantity for user: ${userId}`, { productId, quantity });

    try {
      // Check if product exists and has enough stock
      const product = await lastValueFrom(this.productService.getProduct(productId));
      
      if (!product) {
        this.logger.warn(`Product not found: ${productId}`);
        throw new BadRequestException('Product not found');
      }

      if (product.stock < quantity) {
        this.logger.warn(`Insufficient stock for product: ${productId}`);
        throw new BadRequestException(`Insufficient stock. Available: ${product.stock}`);
      }

      const cart = await this.cartModel.findOne({ userId }).exec();
      if (!cart) {
        this.logger.warn(`Cart not found for user: ${userId}`);
        throw new NotFoundException('Cart not found');
      }

      const itemIndex = cart.items.findIndex(item => item.productId === productId);
      if (itemIndex === -1) {
        this.logger.warn(`Item not found in cart: ${productId}`);
        throw new NotFoundException('Item not found in cart');
      }

      cart.items[itemIndex].quantity = quantity;
      cart.totalAmount = cart.items.reduce(
        (total, item) => total + item.price * item.quantity,
        0
      );

      const updatedCart = await cart.save();
      this.logger.debug(`Item quantity updated successfully for user: ${userId}`);
      return updatedCart;
    } catch (error) {
      this.logger.error(`Error updating item quantity: ${error.message}`, error.stack);
      throw error;
    }
  }

  async removeItem(userId: string, productId: string): Promise<Cart> {
    this.logger.debug(`Removing item from cart for user: ${userId}`, { productId });

    try {
      const cart = await this.cartModel.findOne({ userId }).exec();
      if (!cart) {
        this.logger.warn(`Cart not found for user: ${userId}`);
        throw new NotFoundException('Cart not found');
      }

      cart.items = cart.items.filter(item => item.productId !== productId);
      cart.totalAmount = cart.items.reduce(
        (total, item) => total + item.price * item.quantity,
        0
      );

      const updatedCart = await cart.save();
      this.logger.debug(`Item removed successfully for user: ${userId}`);
      return updatedCart;
    } catch (error) {
      this.logger.error(`Error removing item from cart: ${error.message}`, error.stack);
      throw error;
    }
  }

  async clearCart(userId: string): Promise<Cart> {
    this.logger.debug(`Clearing cart for user: ${userId}`);

    try {
      const cart = await this.cartModel.findOne({ userId }).exec();
      if (!cart) {
        this.logger.warn(`Cart not found for user: ${userId}`);
        throw new NotFoundException('Cart not found');
      }

      cart.items = [];
      cart.totalAmount = 0;

      const clearedCart = await cart.save();
      this.logger.debug(`Cart cleared successfully for user: ${userId}`);
      return clearedCart;
    } catch (error) {
      this.logger.error(`Error clearing cart: ${error.message}`, error.stack);
      throw error;
    }
  }

  private calculateTotal(items: any[]): number {
    try {
      return items.reduce((total, item) => total + (item.price * item.quantity), 0);
    } catch (error) {
      this.logger.error(`Error calculating total: ${error.message}`);
      return 0;
    }
  }
} 