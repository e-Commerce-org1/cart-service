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
import { CartDetailsResponse } from './interfaces/cart.interface';

@Injectable()
export class CartService {
  private readonly logger = new Logger(CartService.name);

  constructor(
    @InjectModel(Cart.name) private cartModel: Model<CartDocument>,
    private authService: AuthService,
    private productService: ProductService,
  ) {}

  async getCartDetails(userId: string): Promise<CartDetailsResponse> {
    this.validateUserId(userId);
    const cart = await this.findCartByUserId(userId);
    if (!cart) {
      throw new NotFoundException(ERROR_MESSAGES.CART.NOT_FOUND);
    }
    
    const itemsWithDetails = await Promise.all(
      cart.items.map(async item => {
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
      })
    );
   
    const totalAmount = await this.calculateTotal(itemsWithDetails);
    return {
      items: itemsWithDetails,
      totalAmount,
    };
  }

  async addItem(userId: string, productId: string, addItemDto: AddItemDto): Promise<Cart> {
    this.validateUserId(userId);
    this.validateProductId(productId);

    const product = await this.getProductDetails(productId);
    let cart = await this.findCartByUserId(userId);

    if (!cart) {
      cart = await this.createNewCart(userId);
    }

    await this.addOrUpdateCartItem(cart, productId, addItemDto, product);
    return this.saveCart(cart);
  }

  async updateItem(userId: string, productId: string, quantity: number): Promise<Cart> {
    this.validateUserId(userId);
    this.validateProductId(productId);
    this.validateQuantity(quantity);

    try {
      const cart = await this.cartModel.findOne({ 
        userId,
        'items.productId': productId 
      });

      if (!cart) {
        throw new NotFoundException(ERROR_MESSAGES.CART.ITEM_NOT_FOUND);
      }


    const product = await this.getProductDetails(productId);
      
      if (quantity > product.stock) {
        throw new BadRequestException(`Not enough stock available. Only ${product.stock} items left.`);
      }

      const result = await this.cartModel.updateOne(
        { 
          userId,
          'items.productId': productId 
        },
        { 
          $set: { 
            'items.$.quantity': quantity,
            totalAmount: await this.calculateTotal(
              cart.items.map(item => 
                item.productId === productId 
                  ? { ...item, quantity } 
                  : item
              )
            )
          }
        }
      );

      if (result.modifiedCount === 0) {
        throw new NotFoundException(ERROR_MESSAGES.CART.ITEM_NOT_FOUND);
      }

      const updatedCart = await this.findCartByUserId(userId);
      if (!updatedCart) {
        throw new NotFoundException(ERROR_MESSAGES.CART.NOT_FOUND);
      }
      return updatedCart;
    } catch (error) {
      this.logger.error(`Error updating cart item: ${error.message}`);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(ERROR_MESSAGES.CART.UPDATE_ERROR);
    }
  }

  async updateItemSize(userId: string, productId: string, size: string): Promise<Cart> {
    this.validateUserId(userId);
    this.validateProductId(productId);

    try {
      const cart = await this.cartModel.findOne({ 
        userId,
        'items.productId': productId 
      });
    
    if (!cart) {
        throw new NotFoundException(ERROR_MESSAGES.CART.ITEM_NOT_FOUND);
      }

      const product = await this.getProductDetails(productId);
      
      // Check if the requested size is available
      if (!product.availableSizes.includes(size)) {
        throw new BadRequestException(`Size ${size} is not available for this product`);
      }

      // Find the variant with the requested size to check stock
      const variant = product.variants.find(v => v.size === size);
      if (!variant || variant.stock < 1) {
        throw new BadRequestException(`Size ${size} is out of stock`);
      }

      const result = await this.cartModel.updateOne(
        { 
          userId,
          'items.productId': productId 
        },
        { 
          $set: { 
            'items.$.size': size
          }
        }
      );

      if (result.modifiedCount === 0) {
        throw new NotFoundException(ERROR_MESSAGES.CART.ITEM_NOT_FOUND);
      }

      const updatedCart = await this.findCartByUserId(userId);
      if (!updatedCart) {
      throw new NotFoundException(ERROR_MESSAGES.CART.NOT_FOUND);
      }
      return updatedCart;
    } catch (error) {
      this.logger.error(`Error updating cart item size: ${error.message}`);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(ERROR_MESSAGES.CART.UPDATE_ERROR);
    }
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
    return this.saveCart(cart);
  }

  async incrementItem(userId: string, productId: string): Promise<Cart> {
    this.validateUserId(userId);
    this.validateProductId(productId);

    const cart = await this.findCartByUserId(userId);
    if (!cart) throw new NotFoundException(ERROR_MESSAGES.CART.NOT_FOUND);

    const itemIndex = cart.items.findIndex(item => item.productId === productId);
    if (itemIndex === -1) throw new NotFoundException(ERROR_MESSAGES.CART.ITEM_NOT_FOUND);

    
    const product = await this.getProductDetails(productId);
    if (cart.items[itemIndex].quantity + 1 > product.stock) {
      throw new BadRequestException(`Not enough stock available. Only ${product.stock} items left.`);
    }

    cart.items[itemIndex].quantity += 1;
    cart.items[itemIndex].price = product.price; 
    return this.saveCart(cart);
  }

  async decrementItem(userId: string, productId: string): Promise<Cart> {
    this.validateUserId(userId);
    this.validateProductId(productId);

    const cart = await this.findCartByUserId(userId);
    if (!cart) throw new NotFoundException(ERROR_MESSAGES.CART.NOT_FOUND);

    const itemIndex = cart.items.findIndex(item => item.productId === productId);
    if (itemIndex === -1) throw new NotFoundException(ERROR_MESSAGES.CART.ITEM_NOT_FOUND);

    const product = await this.getProductDetails(productId);

    if (cart.items[itemIndex].quantity > 1) {
      cart.items[itemIndex].quantity -= 1;
      cart.items[itemIndex].price = product.price; 
    } else {
      cart.items.splice(itemIndex, 1);
    }
    return this.saveCart(cart);
  }

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

  private validateQuantity(quantity: number): void {
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new BadRequestException('Quantity must be a positive integer');
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
      items: []
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

      if (!Array.isArray(productData.variants)) {
        this.logger.warn(`Product ${productId} has no variants array`);
        return {
          ...productData,
          color: '',
          size: '',
          stock: 0,
          availableSizes: []
        };
      }

      const defaultVariant = this.validateAndGetDefaultVariant(productData.variants, productId);
      
      // Extract unique sizes from variants
      const availableSizes = [...new Set(
        productData.variants
          .filter(variant => variant && typeof variant.size === 'string')
          .map(variant => variant.size)
      )];
      
      return {
        ...productData,
        color: defaultVariant.color || '',
        size: defaultVariant.size || '',
        stock: defaultVariant.stock || 0,
        availableSizes
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

  private async addOrUpdateCartItem(cart: CartDocument, productId: string, addItemDto: AddItemDto, product: any): Promise<void> {
   
    if (typeof product.color !== 'string' || typeof product.size !== 'string') {
      this.logger.warn(`Invalid color or size for product ${productId}`);
      product.color = '';
      product.size = '';
    }

    if (typeof product.stock !== 'number' || product.stock < 0) {
      this.logger.warn(`Invalid stock for product ${productId}`);
      product.stock = 0;
    }
    const existingItemIndex = cart.items.findIndex(item => 
      item.productId === productId && 
      item.color === product.color && 
      item.size === product.size
    );
    if (existingItemIndex > -1) {
      
      if (cart.items[existingItemIndex].quantity + 1 > product.stock) {
        throw new BadRequestException(`Not enough stock available. Only ${product.stock} items left.`);
      }
      cart.items[existingItemIndex].quantity += 1;
    } else {
      
      if (product.stock < 1) {
        throw new BadRequestException('Product is out of stock');
      }
      let quantity = addItemDto.quantity;
      if (!quantity || typeof quantity !== 'number' || quantity < 1) {
        quantity = 1;
      }
      cart.items.push({
        productId,
        quantity,
        color: addItemDto.color || product.color || '',
        size: addItemDto.size || product.size || ''
      });
    }
  }

  private async updateCartItemQuantity(cart: CartDocument, productId: string, quantity: number, product: any): Promise<void> {
    const itemIndex = cart.items.findIndex(item => item.productId === productId);
    if (itemIndex === -1) {
      throw new NotFoundException(ERROR_MESSAGES.CART.ITEM_NOT_FOUND);
    }
    cart.items[itemIndex].quantity = quantity;
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
  }

  private async saveCart(cart: CartDocument): Promise<Cart> {
    try {
      return await cart.save();
    } catch (error) {
      this.logger.error(`Failed to save cart: ${error.message}`);
      throw new InternalServerErrorException(ERROR_MESSAGES.CART.SAVE_ERROR);
    }
  }

  private async calculateTotal(items: { productId: string; quantity: number }[]): Promise<number> {
    const itemsWithPrices = await Promise.all(
      items.map(async (item) => {
        const product = await this.getProductDetails(item.productId);
        return item.quantity * product.price;
      })
    );
    return itemsWithPrices.reduce((total, price) => total + price, 0);
  }
} 

