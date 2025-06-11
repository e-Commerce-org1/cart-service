import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { Cart } from './schemas/cart.schema';
import { AddItemDto } from './dto/add-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { AuthGuard } from '../auth/guards/auth.guard';

@ApiTags('Cart')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard)
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Get cart details',
    description: 'Retrieves the current user\'s cart with all items and total amount'
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the cart details',
    type: Cart,
    schema: {
      example: {
        userId: "user123",
        items: [
          {
            productId: "product1",
            quantity: 2,
            price: 29.99,
            name: "Product Name",
            image: "https://example.com/image.jpg"
          }
        ],
        totalAmount: 59.98
      }
    }
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized - Invalid or missing token',
    schema: {
      example: {
        statusCode: 401,
        message: "No token provided"
      }
    }
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Cart not found',
    schema: {
      example: {
        statusCode: 404,
        message: "Cart not found"
      }
    }
  })
  async getCart(@Request() req) {
    return this.cartService.getCart(req.user.entityId);
  }

  @Post('items')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ 
    summary: 'Add item to cart',
    description: 'Adds a new product to the cart or updates quantity if product already exists'
  })
  @ApiBody({
    type: AddItemDto,
    description: 'Product details to add to cart',
    examples: {
      example1: {
        value: {
          productId: "product1",
          quantity: 2
        }
      }
    }
  })
  @ApiResponse({
    status: 201,
    description: 'Item added to cart successfully',
    type: Cart,
    schema: {
      example: {
        userId: "user123",
        items: [
          {
            productId: "product1",
            quantity: 2,
            price: 29.99,
            name: "Product Name",
            image: "https://example.com/image.jpg"
          }
        ],
        totalAmount: 59.98
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Invalid input',
    schema: {
      example: {
        statusCode: 400,
        message: "Invalid product ID"
      }
    }
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized - Invalid or missing token',
    schema: {
      example: {
        statusCode: 401,
        message: "No token provided"
      }
    }
  })
  async addItem(
    @Request() req,
    @Body() addItemDto: AddItemDto,
  ) {
    return this.cartService.addItem(req.user.entityId, addItemDto);
  }

  @Put('items/:productId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Update item quantity',
    description: 'Updates the quantity of an existing item in the cart'
  })
  @ApiParam({
    name: 'productId',
    description: 'ID of the product to update',
    example: 'product1'
  })
  @ApiBody({
    type: UpdateItemDto,
    description: 'New quantity for the item',
    examples: {
      example1: {
        value: {
          quantity: 3
        }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Item quantity updated successfully',
    type: Cart,
    schema: {
      example: {
        userId: "user123",
        items: [
          {
            productId: "product1",
            quantity: 3,
            price: 29.99,
            name: "Product Name",
            image: "https://example.com/image.jpg"
          }
        ],
        totalAmount: 89.97
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Invalid input',
    schema: {
      example: {
        statusCode: 400,
        message: "Quantity must be at least 1"
      }
    }
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized - Invalid or missing token',
    schema: {
      example: {
        statusCode: 401,
        message: "No token provided"
      }
    }
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Cart or item not found',
    schema: {
      example: {
        statusCode: 404,
        message: "Item not found in cart"
      }
    }
  })
  async updateItem(
    @Request() req,
    @Param('productId') productId: string,
    @Body() updateItemDto: UpdateItemDto,
  ) {
    return this.cartService.updateItem(req.user.entityId, productId, updateItemDto.quantity);
  }

  @Delete('items/:productId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Remove item from cart',
    description: 'Removes a specific item from the cart'
  })
  @ApiParam({
    name: 'productId',
    description: 'ID of the product to remove',
    example: 'product1'
  })
  @ApiResponse({
    status: 200,
    description: 'Item removed successfully',
    type: Cart,
    schema: {
      example: {
        userId: "user123",
        items: [],
        totalAmount: 0
      }
    }
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized - Invalid or missing token',
    schema: {
      example: {
        statusCode: 401,
        message: "No token provided"
      }
    }
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Cart or item not found',
    schema: {
      example: {
        statusCode: 404,
        message: "Item not found in cart"
      }
    }
  })
  async removeItem(
    @Request() req,
    @Param('productId') productId: string,
  ) {
    return this.cartService.removeItem(req.user.entityId, productId);
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Clear cart',
    description: 'Removes all items from the cart'
  })
  @ApiResponse({
    status: 200,
    description: 'Cart cleared successfully',
    type: Cart,
    schema: {
      example: {
        userId: "user123",
        items: [],
        totalAmount: 0
      }
    }
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized - Invalid or missing token',
    schema: {
      example: {
        statusCode: 401,
        message: "No token provided"
      }
    }
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Cart not found',
    schema: {
      example: {
        statusCode: 404,
        message: "Cart not found"
      }
    }
  })
  async clearCart(@Request() req) {
    return this.cartService.clearCart(req.user.entityId);
  }
} 