import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';

export class UpdateItemDto {
  @ApiProperty({
    description: 'New quantity for the item',
    example: 3,
    minimum: 1,
    required: true
  })
  @IsNumber()
  @Min(1)
  quantity: number;
} 