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
import { Cart } from './schemas/cart.schema';
import { AddItemDto } from './dto/add-item.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { UserIdRequest } from './dto/cart.interface';
import {
  ApiCartTags,
  ApiGetCartDetails,
  ApiAddItem,
  ApiUpdateItem,
  ApiRemoveItem,
  ApiClearCart,
} from './swagger/cart.swagger';

@ApiCartTags()
@UseGuards(AuthGuard)
@Controller('api/v1/cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiGetCartDetails()
  async getCartDetails(userId: string) {
    return this.cartService.getCartDetails(userId);
  }

  @Post('items')
  @ApiAddItem()
  async addItem(
    @Request() req,
    @Body() addItemDto: AddItemDto,
  ) {
    return this.cartService.addItem(req.user.entityId, addItemDto);
  }

  @Put('items/:productId')
  @ApiUpdateItem()
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
  @ApiRemoveItem()
  async removeItem(
    @Request() req,
    @Param('productId') productId: string,
  ) {
    return this.cartService.removeItem(req.user.entityId, productId);
  }

  @Delete()
  @ApiClearCart()
  async clearCart(@Request() req) {
    return this.cartService.clearCart(req.user.entityId);
  }
} 