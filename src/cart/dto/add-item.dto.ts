import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, Min } from 'class-validator';

export class AddItemDto {
  @ApiProperty({
    description: 'ID of the product to add to cart',
    example: 'product123',
    required: true
  })
  @IsString()
  productId: string;

  @ApiProperty({
    description: 'Quantity of the product to add',
    example: 2,
    minimum: 1,
    required: true
  })
  @IsNumber()
  @Min(1)
  quantity: number;
} 