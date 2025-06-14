import { applyDecorators } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { Cart } from '../schemas/cart.schema';

export const ApiCartTags = () => applyDecorators(
  ApiTags('Cart'),
  ApiBearerAuth('JWT-auth')
);

export const ApiGetCartDetails = () => applyDecorators(
  ApiOperation({ summary: 'Get cart details' }),
  ApiResponse({
    status: 200,
    description: 'Returns the cart details',
    type: Cart,
  }),
  ApiResponse({ status: 401, description: 'Unauthorized' }),
  ApiResponse({ status: 404, description: 'Cart not found' })
);

export const ApiAddItem = () => applyDecorators(
  ApiOperation({ summary: 'Add item to cart' }),
  ApiResponse({
    status: 201,
    description: 'Item added to cart successfully',
    type: Cart,
  }),
  ApiResponse({ status: 400, description: 'Invalid input' }),
  ApiResponse({ status: 401, description: 'Unauthorized' })
);

export const ApiUpdateItem = () => applyDecorators(
  ApiOperation({ summary: 'Update item quantity' }),
  ApiParam({ name: 'productId', description: 'Product ID' }),
  ApiQuery({ name: 'quantity', description: 'New quantity for the item', required: true, type: Number }),
  ApiResponse({
    status: 200,
    description: 'Item quantity updated successfully',
    type: Cart,
  }),
  ApiResponse({ status: 400, description: 'Invalid input' }),
  ApiResponse({ status: 401, description: 'Unauthorized' }),
  ApiResponse({ status: 404, description: 'Cart or item not found' })
);

export const ApiRemoveItem = () => applyDecorators(
  ApiOperation({ summary: 'Remove item from cart' }),
  ApiParam({ name: 'productId', description: 'Product ID' }),
  ApiResponse({
    status: 200,
    description: 'Item removed successfully',
    type: Cart,
  }),
  ApiResponse({ status: 401, description: 'Unauthorized' }),
  ApiResponse({ status: 404, description: 'Cart or item not found' })
);

export const ApiClearCart = () => applyDecorators(
  ApiOperation({ summary: 'Clear cart' }),
  ApiResponse({
    status: 200,
    description: 'Cart cleared successfully',
    type: Cart,
  }),
  ApiResponse({ status: 401, description: 'Unauthorized' }),
  ApiResponse({ status: 404, description: 'Cart not found' })
); 