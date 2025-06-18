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
    description: 'Successfully retrieved cart details',
    type: Cart,
  }),
  ApiResponse({ 
    status: 400, 
    description: 'Bad Request - Invalid input parameters' 
  }),
  ApiResponse({ 
    status: 401, 
    description: 'Unauthorized - Invalid or missing authentication token' 
  }),
  ApiResponse({ 
    status: 403, 
    description: 'Forbidden - User does not have permission to access this resource' 
  }),
  ApiResponse({ 
    status: 404, 
    description: 'Not Found - Cart not found for the specified user' 
  }),
  ApiResponse({ 
    status: 500, 
    description: 'Internal Server Error - Something went wrong on the server' 
  })
);

export const ApiAddItem = () => applyDecorators(
  ApiOperation({ summary: 'Add item to cart' }),
  ApiResponse({
    status: 201,
    description: 'Successfully added item to cart',
    type: Cart,
  }),
  ApiResponse({ 
    status: 400, 
    description: 'Bad Request - Invalid input data or validation failed' 
  }),
  ApiResponse({ 
    status: 401, 
    description: 'Unauthorized - Invalid or missing authentication token' 
  }),
  ApiResponse({ 
    status: 403, 
    description: 'Forbidden - User does not have permission to modify cart' 
  }),
  ApiResponse({ 
    status: 404, 
    description: 'Not Found - Product not found' 
  }),
  ApiResponse({ 
    status: 409, 
    description: 'Conflict - Item already exists in cart' 
  }),
  ApiResponse({ 
    status: 500, 
    description: 'Internal Server Error - Something went wrong on the server' 
  })
);

export const ApiUpdateItem = () => applyDecorators(
  ApiOperation({ summary: 'Update item quantity' }),
  ApiParam({ name: 'productId', description: 'Product ID' }),
  ApiQuery({ name: 'quantity', description: 'New quantity for the item', required: true, type: Number }),
  ApiResponse({
    status: 200,
    description: 'Successfully updated item quantity',
    type: Cart,
  }),
  ApiResponse({ 
    status: 400, 
    description: 'Bad Request - Invalid quantity or product ID' 
  }),
  ApiResponse({ 
    status: 401, 
    description: 'Unauthorized - Invalid or missing authentication token' 
  }),
  ApiResponse({ 
    status: 403, 
    description: 'Forbidden - User does not have permission to modify cart' 
  }),
  ApiResponse({ 
    status: 404, 
    description: 'Not Found - Cart or item not found' 
  }),
  ApiResponse({ 
    status: 500, 
    description: 'Internal Server Error - Something went wrong on the server' 
  })
);

export const ApiRemoveItem = () => applyDecorators(
  ApiOperation({ summary: 'Remove item from cart' }),
  ApiParam({ name: 'productId', description: 'Product ID' }),
  ApiResponse({
    status: 200,
    description: 'Successfully removed item from cart',
    type: Cart,
  }),
  ApiResponse({ 
    status: 400, 
    description: 'Bad Request - Invalid product ID' 
  }),
  ApiResponse({ 
    status: 401, 
    description: 'Unauthorized - Invalid or missing authentication token' 
  }),
  ApiResponse({ 
    status: 403, 
    description: 'Forbidden - User does not have permission to modify cart' 
  }),
  ApiResponse({ 
    status: 404, 
    description: 'Not Found - Cart or item not found' 
  }),
  ApiResponse({ 
    status: 500, 
    description: 'Internal Server Error - Something went wrong on the server' 
  })
);

export const ApiClearCart = () => applyDecorators(
  ApiOperation({ summary: 'Clear cart' }),
  ApiResponse({
    status: 200,
    description: 'Successfully cleared cart',
    type: Cart,
  }),
  ApiResponse({ 
    status: 401, 
    description: 'Unauthorized - Invalid or missing authentication token' 
  }),
  ApiResponse({ 
    status: 403, 
    description: 'Forbidden - User does not have permission to modify cart' 
  }),
  ApiResponse({ 
    status: 404, 
    description: 'Not Found - Cart not found' 
  }),
  ApiResponse({ 
    status: 500, 
    description: 'Internal Server Error - Something went wrong on the server' 
  })
); 