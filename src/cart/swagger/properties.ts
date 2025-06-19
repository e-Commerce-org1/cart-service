// Swagger property decorators for DTOs and Schemas
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const QuantityProperty = () => ApiPropertyOptional({ example: 1, description: 'Quantity of the product (default 1)' });
export const ColorProperty = () => ApiPropertyOptional({ example: 'Red', description: 'Color of the product' });
export const SizeProperty = () => ApiPropertyOptional({ example: 'M', description: 'Size of the product' });
export const ProductIdProperty = () => ApiProperty({ description: 'Product ID', example: 'product123' });
export const CartItemQuantityProperty = () => ApiProperty({ description: 'Quantity of the product', example: 2, minimum: 1 });
export const PriceProperty = () => ApiProperty({ description: 'Price of the product at the time of cart update', example: 1999, required: false });
export const UserIdProperty = () => ApiProperty({ description: 'User ID', example: 'user123' });
export const ItemsProperty = (type: any) => ApiProperty({ description: 'Items in the cart', type: [type] }); 