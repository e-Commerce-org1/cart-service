import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';

export class UpdateItemDto {
  @ApiProperty({
    description: 'New quantity of the item',
    example: 2,
    minimum: 1,
    required: true,
  })
  @IsNumber()
  @Min(1)
  quantity: number;
} 