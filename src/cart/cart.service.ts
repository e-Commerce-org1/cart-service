import { Injectable, Inject } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { Cart, CartItem, CartResponse } from '../interfaces/cart.interface';
import { AuthResponse } from '../interfaces/service-response.interface';

interface AuthService {
  validateToken(token: { token: string }): Promise<AuthResponse>;
}

interface ProductService {
  getProduct(productId: { id: string }): Promise<{ id: string; price: number }>;
}

@Injectable()
export class CartService {
  private authService: AuthService;
  private productService: ProductService;

  constructor(
    @Inject('AUTH_PACKAGE') private authClient: ClientGrpc,
    @Inject('PRODUCT_PACKAGE') private productClient: ClientGrpc,
  ) {
    this.authService = this.authClient.getService<AuthService>('AuthService');
    this.productService = this.productClient.getService<ProductService>('ProductService');
  }

  private carts: Map<string, Cart> = new Map();

  async validateToken(token: string): Promise<boolean> {
    try {
      const response = await this.authService.validateToken({ token });
      return response.isValid;
    } catch (error) {
      console.error('Error validating token:', error);
      return false;
    }
  }

  async getProductPrice(productId: string): Promise<number> {
    try {
      const product = await this.productService.getProduct({ id: productId });
      return product.price;
    } catch (error) {
      console.error('Error getting product price:', error);
      throw new Error('Failed to get product price');
    }
  }

  async addItem(userId: string, item: CartItem): Promise<CartResponse> {
    try {
      const price = await this.getProductPrice(item.productId);
      item.price = price;

      let cart = this.carts.get(userId);
      if (!cart) {
        cart = {
          userId,
          items: [],
          totalAmount: 0,
        };
      }

      const existingItemIndex = cart.items.findIndex(
        (i) => i.productId === item.productId,
      );

      if (existingItemIndex > -1) {
        cart.items[existingItemIndex].quantity += item.quantity;
      } else {
        cart.items.push(item);
      }

      cart.totalAmount = cart.items.reduce(
        (total, item) => total + item.price * item.quantity,
        0,
      );

      this.carts.set(userId, cart);

      return {
        cart,
        success: true,
        message: 'Item added to cart successfully',
      };
    } catch (error) {
      console.error('Error adding item to cart:', error);
      return {
        cart: null,
        success: false,
        message: 'Failed to add item to cart',
      };
    }
  }

  async removeItem(userId: string, productId: string): Promise<CartResponse> {
    try {
      const cart = this.carts.get(userId);
      if (!cart) {
        return {
          cart: null,
          success: false,
          message: 'Cart not found',
        };
      }

      cart.items = cart.items.filter((item) => item.productId !== productId);
      cart.totalAmount = cart.items.reduce(
        (total, item) => total + item.price * item.quantity,
        0,
      );

      this.carts.set(userId, cart);

      return {
        cart,
        success: true,
        message: 'Item removed from cart successfully',
      };
    } catch (error) {
      console.error('Error removing item from cart:', error);
      return {
        cart: null,
        success: false,
        message: 'Failed to remove item from cart',
      };
    }
  }

  async updateItem(
    userId: string,
    productId: string,
    quantity: number,
  ): Promise<CartResponse> {
    try {
      const cart = this.carts.get(userId);
      if (!cart) {
        return {
          cart: null,
          success: false,
          message: 'Cart not found',
        };
      }

      const item = cart.items.find((i) => i.productId === productId);
      if (!item) {
        return {
          cart: null,
          success: false,
          message: 'Item not found in cart',
        };
      }

      item.quantity = quantity;
      cart.totalAmount = cart.items.reduce(
        (total, item) => total + item.price * item.quantity,
        0,
      );

      this.carts.set(userId, cart);

      return {
        cart,
        success: true,
        message: 'Item quantity updated successfully',
      };
    } catch (error) {
      console.error('Error updating item in cart:', error);
      return {
        cart: null,
        success: false,
        message: 'Failed to update item quantity',
      };
    }
  }

  async getCart(userId: string): Promise<CartResponse> {
    try {
      const cart = this.carts.get(userId);
      return {
        cart: cart || null,
        success: true,
        message: cart ? 'Cart retrieved successfully' : 'Cart is empty',
      };
    } catch (error) {
      console.error('Error getting cart:', error);
      return {
        cart: null,
        success: false,
        message: 'Failed to get cart',
      };
    }
  }

  async clearCart(userId: string): Promise<CartResponse> {
    try {
      this.carts.delete(userId);
      return {
        cart: null,
        success: true,
        message: 'Cart cleared successfully',
      };
    } catch (error) {
      console.error('Error clearing cart:', error);
      return {
        cart: null,
        success: false,
        message: 'Failed to clear cart',
      };
    }
  }
} 