import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, Min } from 'class-validator';

export class AddItemDto {
  @ApiProperty({
    description: 'Product ID',
    example: 'product123',
    required: true,
  })
  @IsString()
  productId: string;

  @ApiProperty({
    description: 'Quantity of the product',
    example: 1,
    minimum: 1,
    required: true,
  })
  @IsNumber()
  @Min(1)
  quantity: number;
} 