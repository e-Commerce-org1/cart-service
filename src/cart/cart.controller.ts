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
import { AddItemDto } from './interfaces/add-item.interface';
import { UpdateSizeDto } from './interfaces/update-size.interface';
import { AuthGuard } from '../middleware/guards/auth.guard';
import { UserIdRequest } from './interfaces/cart.interface';
import {
  ApiCartTags,
  ApiGetCartDetails,
  ApiAddItem,
  ApiUpdateItem,
  ApiRemoveItem,
  ApiClearCart,
  ApiUpdateItemSize,
} from './swagger/cart.swagger';

@ApiCartTags()
@UseGuards(AuthGuard)
@Controller('api/v1/cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiGetCartDetails()
  async getCartDetails(@Request() req) {
    return this.cartService.getCartDetails(req.user.entityId);
  }

  @Post()
  @ApiAddItem()
  async addItem(
    @Request() req,
    @Body() addItemDto: AddItemDto,
  ) {
    return this.cartService.addItem(req.user.entityId, addItemDto);
  }

  @Put('/:productId')
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

  @Put('/:productId/size')
  @ApiUpdateItemSize()
  async updateItemSize(
    @Request() req,
    @Param('productId') productId: string,
    @Body() updateSizeDto: UpdateSizeDto,
  ) {
    return this.cartService.updateItemSize(req.user.entityId, productId, updateSizeDto.size);
  }

  @Delete('/:productId')
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