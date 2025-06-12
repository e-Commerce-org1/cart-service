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
  Query,
  BadRequestException,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { Cart } from './schemas/cart.schema';
import { AddItemDto } from './dto/add-item.dto';
import { AuthGuard } from '../auth/guards/auth.guard';

@ApiTags('Cart')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard)
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Get cart details' })
  @ApiResponse({
    status: 200,
    description: 'Returns the cart details',
    type: Cart,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Cart not found' })
  async getCart(@Request() req) {
    return this.cartService.getCart(req.user.entityId);
  }

  @Post('items')
  @ApiOperation({ summary: 'Add item to cart' })
  @ApiResponse({
    status: 201,
    description: 'Item added to cart successfully',
    type: Cart,
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async addItem(
    @Request() req,
    @Body() addItemDto: AddItemDto,
  ) {
    return this.cartService.addItem(req.user.entityId, addItemDto);
  }

  @Put('items/:productId')
  @ApiOperation({ summary: 'Update item quantity' })
  @ApiParam({ name: 'productId', description: 'Product ID' })
  @ApiQuery({ name: 'quantity', description: 'New quantity for the item', required: true, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Item quantity updated successfully',
    type: Cart,
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Cart or item not found' })
  async updateItem(
    @Request() req,
    @Param('productId') productId: string,
    @Query('quantity') quantity: string,
  ) {
    const quantityNumber = Number(quantity);
    if (isNaN(quantityNumber)) {
      throw new BadRequestException('Quantity must be a number');
    }
    return this.cartService.updateItem(req.user.entityId, productId, quantityNumber);
  }

  @Delete('items/:productId')
  @ApiOperation({ summary: 'Remove item from cart' })
  @ApiParam({ name: 'productId', description: 'Product ID' })
  @ApiResponse({
    status: 200,
    description: 'Item removed successfully',
    type: Cart,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Cart or item not found' })
  async removeItem(
    @Request() req,
    @Param('productId') productId: string,
  ) {
    return this.cartService.removeItem(req.user.entityId, productId);
  }

  @Delete()
  @ApiOperation({ summary: 'Clear cart' })
  @ApiResponse({
    status: 200,
    description: 'Cart cleared successfully',
    type: Cart,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Cart not found' })
  async clearCart(@Request() req) {
    return this.cartService.clearCart(req.user.entityId);
  }
} 