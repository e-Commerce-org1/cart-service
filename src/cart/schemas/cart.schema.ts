import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type CartDocument = Cart & Document;

@Schema()
export class CartItem {
  @ApiProperty({
    description: 'Product ID',
    example: 'product123',
  })
  @Prop({ required: true })
  productId: string;

  @ApiProperty({
    description: 'Quantity of the product',
    example: 2,
    minimum: 1,
  })
  @Prop({ required: true, min: 1 })
  quantity: number;

  @ApiProperty({
    description: 'Price of the product',
    example: 29.99,
  })
  @Prop({ required: true })
  price: number;

  @ApiProperty({
    description: 'Name of the product',
    example: 'Product Name',
  })
  @Prop({ required: true })
  name: string;

  @ApiProperty({
    description: 'Image URL of the product',
    example: 'https://example.com/image.jpg',
    required: false,
  })
  @Prop()
  image?: string;
}

@Schema({ timestamps: true })
export class Cart {
  @ApiProperty({
    description: 'User ID',
    example: 'user123',
  })
  @Prop({ required: true })
  userId: string;

  @ApiProperty({
    description: 'Items in the cart',
    type: [CartItem],
  })
  @Prop({ type: [CartItem], default: [] })
  items: CartItem[];

  @ApiProperty({
    description: 'Total amount of the cart',
    example: 59.98,
  })
  @Prop({ required: true, default: 0 })
  totalAmount: number;
}

export const CartSchema = SchemaFactory.createForClass(Cart); 