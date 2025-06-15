import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cart, CartDocument } from './schemas/cart.schema';
import { ERROR_MESSAGES } from '../common/constants/error-messages';
import { Logger } from '@nestjs/common';
import { AddItemDto } from './interfaces/add-item.interface';
import { lastValueFrom } from 'rxjs';
import { timeout, catchError } from 'rxjs/operators';
import { AuthService } from '../middleware/services/auth.service';
import { ProductService } from '../product/services/product.service';

@Injectable()
export class CartService {
  private readonly logger = new Logger(CartService.name);

  constructor(
    @InjectModel(Cart.name) private cartModel: Model<CartDocument>,
    private authService: AuthService,
    private productService: ProductService,
  ) {}

  async getCartDetails(userId: string): Promise<Cart> {
    this.validateUserId(userId);
    const cart = await this.findCartByUserId(userId);
    if (!cart) {
      throw new NotFoundException(ERROR_MESSAGES.CART.NOT_FOUND);
    }
    return cart;
  }

  async addItem(userId: string, addItemDto: AddItemDto): Promise<Cart> {
    this.validateUserId(userId);
    this.validateProductId(addItemDto.productId);

    const product = await this.getProductDetails(addItemDto.productId);
    let cart = await this.findCartByUserId(userId);

    if (!cart) {
      cart = await this.createNewCart(userId);
    }

    await this.addOrUpdateCartItem(cart, addItemDto, product);
    return this.saveCart(cart);
  }

  async updateItem(userId: string, productId: string, quantity: number): Promise<Cart> {
    this.validateUserId(userId);
    this.validateProductId(productId);

    const product = await this.getProductDetails(productId);
    const cart = await this.findCartByUserId(userId);
    
    if (!cart) {
      throw new NotFoundException(ERROR_MESSAGES.CART.NOT_FOUND);
    }

    await this.updateCartItemQuantity(cart, productId, quantity, product);
    return this.saveCart(cart);
  }

  async removeItem(userId: string, productId: string): Promise<Cart> {
    this.validateUserId(userId);
    this.validateProductId(productId);

    const cart = await this.findCartByUserId(userId);
    if (!cart) {
      throw new NotFoundException(ERROR_MESSAGES.CART.NOT_FOUND);
    }

    await this.decreaseItemQuantity(cart, productId);
    return this.saveCart(cart);
  }

  async clearCart(userId: string): Promise<Cart> {
    this.validateUserId(userId);
    const cart = await this.findCartByUserId(userId);
    
    if (!cart) {
      throw new NotFoundException(ERROR_MESSAGES.CART.NOT_FOUND);
    }

    cart.items = [];
    cart.totalAmount = 0;
    return this.saveCart(cart);
  }

  // Private helper methods
  private validateUserId(userId: string): void {
    if (!userId) {
      throw new BadRequestException(ERROR_MESSAGES.VALIDATION.USER_ID_REQUIRED);
    }
  }

  private validateProductId(productId: string): void {
    if (!productId) {
      throw new BadRequestException(ERROR_MESSAGES.VALIDATION.PRODUCT_ID_REQUIRED);
    }
  }

  private async findCartByUserId(userId: string): Promise<CartDocument | null> {
    try {
      return await this.cartModel.findOne({ userId }).exec();
    } catch (error) {
      this.logger.error(`Database error while finding cart: ${error.message}`);
      throw new InternalServerErrorException(ERROR_MESSAGES.CART.DATABASE_ERROR);
    }
  }

  private async createNewCart(userId: string): Promise<CartDocument> {
    return new this.cartModel({
      userId,
      items: [],
      totalAmount: 0
    });
  }

  private async getProductDetails(productId: string) {
    try {
      const response = await lastValueFrom(
        this.productService.getProduct(productId).pipe(
          timeout(5000),
          catchError(error => {
            this.logger.error(`Product service error: ${error.message}`);
            if (error.name === 'TimeoutError') {
              throw new BadRequestException('Product service timeout');
            }
            throw new BadRequestException(ERROR_MESSAGES.CART.PRODUCT_SERVICE_ERROR);
          })
        )
      );

      if (!response || response.code !== 200) {
        throw new BadRequestException(ERROR_MESSAGES.CART.PRODUCT_NOT_FOUND);
      }

      const productData = JSON.parse(response.data);
      if (!productData.price || !productData.name) {
        throw new BadRequestException(ERROR_MESSAGES.CART.INCOMPLETE_PRODUCT_DATA);
      }

      // Validate variants data
      if (!Array.isArray(productData.variants)) {
        this.logger.warn(`Product ${productId} has no variants array`);
        return {
          ...productData,
          color: '',
          size: '',
          stock: 0
        };
      }

      // Validate and get default variant
      const defaultVariant = this.validateAndGetDefaultVariant(productData.variants, productId);
      
      return {
        ...productData,
        color: defaultVariant.color || '',
        size: defaultVariant.size || '',
        stock: defaultVariant.stock || 0
      };
    } catch (error) {
      this.logger.error(`Error fetching product details: ${error.message}`);
      throw error;
    }
  }

  private validateAndGetDefaultVariant(variants: any[], productId: string) {
    if (!variants.length) {
      this.logger.warn(`Product ${productId} has empty variants array`);
      return {};
    }

    // Validate each variant
    const validVariants = variants.filter(variant => {
      const isValid = typeof variant === 'object' && 
                     variant !== null &&
                     (typeof variant.color === 'string' || !variant.color) &&
                     (typeof variant.size === 'string' || !variant.size) &&
                     (typeof variant.stock === 'number' || !variant.stock);
      
      if (!isValid) {
        this.logger.warn(`Invalid variant found in product ${productId}: ${JSON.stringify(variant)}`);
      }
      return isValid;
    });

    if (!validVariants.length) {
      this.logger.warn(`No valid variants found for product ${productId}`);
      return {};
    }

    return validVariants[0];
  }

  private async addOrUpdateCartItem(cart: CartDocument, addItemDto: AddItemDto, product: any): Promise<void> {
    // Validate color and size
    if (typeof product.color !== 'string' || typeof product.size !== 'string') {
      this.logger.warn(`Invalid color or size for product ${addItemDto.productId}`);
      product.color = '';
      product.size = '';
    }

    // Validate stock
    if (typeof product.stock !== 'number' || product.stock < 0) {
      this.logger.warn(`Invalid stock for product ${addItemDto.productId}`);
      product.stock = 0;
    }

    const existingItemIndex = cart.items.findIndex(item => 
      item.productId === addItemDto.productId && 
      item.color === product.color && 
      item.size === product.size
    );

    if (existingItemIndex > -1) {
      // Check if adding one more item would exceed stock
      if (cart.items[existingItemIndex].quantity + 1 > product.stock) {
        throw new BadRequestException(`Not enough stock available. Only ${product.stock} items left.`);
      }
      cart.items[existingItemIndex].quantity += 1;
    } else {
      // Check if there's any stock available
      if (product.stock < 1) {
        throw new BadRequestException('Product is out of stock');
      }
      cart.items.push({
        productId: addItemDto.productId,
        quantity: 1,
        price: product.price,
        name: product.name,
        image: product.imageUrl || '',
        color: product.color || '',
        size: product.size || ''
      });
    }

    cart.totalAmount = this.calculateTotal(cart.items);
  }

  private async updateCartItemQuantity(cart: CartDocument, productId: string, quantity: number, product: any): Promise<void> {
    const itemIndex = cart.items.findIndex(item => item.productId === productId);
    if (itemIndex === -1) {
      throw new NotFoundException(ERROR_MESSAGES.CART.ITEM_NOT_FOUND);
    }

    cart.items[itemIndex].quantity = quantity;
    cart.totalAmount = this.calculateTotal(cart.items);
  }

  private async decreaseItemQuantity(cart: CartDocument, productId: string): Promise<void> {
    const itemIndex = cart.items.findIndex(item => item.productId === productId);
    if (itemIndex === -1) {
      throw new NotFoundException(ERROR_MESSAGES.CART.ITEM_NOT_FOUND);
    }

    if (cart.items[itemIndex].quantity > 1) {
      cart.items[itemIndex].quantity -= 1;
    } else {
      cart.items.splice(itemIndex, 1);
    }

    cart.totalAmount = this.calculateTotal(cart.items);
  }

  private async saveCart(cart: CartDocument): Promise<Cart> {
    try {
      return await cart.save();
    } catch (error) {
      this.logger.error(`Failed to save cart: ${error.message}`);
      throw new InternalServerErrorException(ERROR_MESSAGES.CART.SAVE_ERROR);
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

