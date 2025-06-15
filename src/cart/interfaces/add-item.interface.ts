import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class AddItemDto {
  @ApiProperty({
    description: 'Product ID',
    example: 'product123',
    required: true,
  })
  @IsString()
  productId: string;
} 