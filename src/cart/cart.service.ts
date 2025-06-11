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
import { timeout, catchError } from 'rxjs/operators';

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
    try {
      if (!userId) {
        throw new BadRequestException('User ID is required');
      }

      console.log(userId);

      const cart = await this.cartModel.findOne({ userId });
      if (!cart) {
        throw new NotFoundException(ERROR_MESSAGES.CART.NOT_FOUND);
      }
      return cart;
    } catch (error) {
      this.logger.error(`Error getting cart for user ${userId}: ${error.message}`);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to retrieve cart');
    }
  }

  async addItem(userId: string, addItemDto: AddItemDto): Promise<Cart> {
    try {
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
        productResponse = await lastValueFrom(
          this.productService.getProduct(addItemDto.productId).pipe(
            timeout(5000), // 5 second timeout
            catchError(error => {
              this.logger.error(`Product service error: ${error.message}`);
              if (error.name === 'TimeoutError') {
                throw new BadRequestException('Product service timeout');
              }
              throw new BadRequestException('Failed to fetch product details');
            })
          )
        );
        this.logger.debug(`Product service response: ${JSON.stringify(productResponse)}`);
      } catch (error) {
        this.logger.error(`Product service error: ${error.message}`);
        throw new BadRequestException(error.message || 'Failed to fetch product details');
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
        this.logger.error(`Failed to parse product data: ${error.message}`);
        throw new BadRequestException('Invalid product data format');
      }

      if (!productData.price || !productData.name) {
        throw new BadRequestException('Product data is incomplete');
      }
      
      let cart;
      try {
        cart = await this.cartModel.findOne({ userId });
      } catch (error) {
        this.logger.error(`Database error while finding cart: ${error.message}`);
        throw new InternalServerErrorException('Failed to access cart');
      }
      
      if (!cart) {
        cart = new this.cartModel({ userId, items: [], totalAmount: 0 });
      }

      const existingItemIndex = cart.items.findIndex(
        (i) => i.productId === addItemDto.productId,
      );

      if (existingItemIndex > -1) {
        cart.items[existingItemIndex].quantity += 1;
      } else {
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
        return await cart.save();
      } catch (error) {
        this.logger.error(`Failed to save cart: ${error.message}`);
        throw new InternalServerErrorException('Failed to update cart');
      }
    } catch (error) {
      this.logger.error(`Error adding item to cart for user ${userId}: ${error.message}`);
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to add item to cart');
    }
  }

  async updateItem(userId: string, productId: string, quantity: number): Promise<Cart> {
    try {
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
        this.logger.error(`Product service error: ${error.message}`);
        throw new BadRequestException('Failed to fetch product details');
      }

      if (!productResponse || productResponse.code !== 200) {
        throw new BadRequestException('Product not found or invalid');
      }

      let cart;
      try {
        cart = await this.cartModel.findOne({ userId });
      } catch (error) {
        this.logger.error(`Database error while finding cart: ${error.message}`);
        throw new InternalServerErrorException('Failed to access cart');
      }

      if (!cart) {
        throw new NotFoundException(ERROR_MESSAGES.CART.NOT_FOUND);
      }

      const itemIndex = cart.items.findIndex(
        (item) => item.productId === productId,
      );

      if (itemIndex === -1) {
        throw new NotFoundException(ERROR_MESSAGES.CART.ITEM_NOT_FOUND);
      }

      cart.items[itemIndex].quantity = quantity;
      cart.totalAmount = this.calculateTotal(cart.items);
      
      try {
        return await cart.save();
      } catch (error) {
        this.logger.error(`Failed to save cart: ${error.message}`);
        throw new InternalServerErrorException('Failed to update cart');
      }
    } catch (error) {
      this.logger.error(`Error updating item in cart for user ${userId}: ${error.message}`);
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to update cart item');
    }
  }

  async removeItem(userId: string, productId: string): Promise<Cart> {
    try {
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
        this.logger.error(`Database error while finding cart: ${error.message}`);
        throw new InternalServerErrorException('Failed to access cart');
      }

      if (!cart) {
        throw new NotFoundException(ERROR_MESSAGES.CART.NOT_FOUND);
      }

      const itemIndex = cart.items.findIndex(item => item.productId === productId);
      if (itemIndex === -1) {
        throw new NotFoundException(ERROR_MESSAGES.CART.ITEM_NOT_FOUND);
      }

      // Decrease quantity by 1
      if (cart.items[itemIndex].quantity > 1) {
        cart.items[itemIndex].quantity -= 1;
      } else {
        // If quantity is 1, remove the item
        cart.items.splice(itemIndex, 1);
      }

      // Recalculate total amount
      cart.totalAmount = this.calculateTotal(cart.items);
      
      try {
        return await cart.save();
      } catch (error) {
        this.logger.error(`Failed to save cart: ${error.message}`);
        throw new InternalServerErrorException('Failed to update cart');
      }
    } catch (error) {
      this.logger.error(`Error removing item from cart for user ${userId}: ${error.message}`);
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to remove item from cart');
    }
  }

  async clearCart(userId: string): Promise<Cart> {
    try {
      if (!userId) {
        throw new BadRequestException('User ID is required');
      }

      let cart;
      try {
        cart = await this.cartModel.findOne({ userId });
      } catch (error) {
        this.logger.error(`Database error while finding cart: ${error.message}`);
        throw new InternalServerErrorException('Failed to access cart');
      }

      if (!cart) {
        throw new NotFoundException(ERROR_MESSAGES.CART.NOT_FOUND);
      }

      cart.items = [];
      cart.totalAmount = 0;
      
      try {
        return await cart.save();
      } catch (error) {
        this.logger.error(`Failed to save cart: ${error.message}`);
        throw new InternalServerErrorException('Failed to clear cart');
      }
    } catch (error) {
      this.logger.error(`Error clearing cart for user ${userId}: ${error.message}`);
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to clear cart');
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