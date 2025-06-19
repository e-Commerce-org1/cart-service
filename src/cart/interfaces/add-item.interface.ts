import { QuantityProperty, ColorProperty, SizeProperty } from '../swagger/properties';
import { IsOptional, IsString, IsInt, Min } from 'class-validator';

export class AddItemDto {
  @QuantityProperty()
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @ColorProperty()
  @IsOptional()
  @IsString()
  color?: string;

  @SizeProperty()
  @IsOptional()
  @IsString()
  size?: string;
} 