import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type CartDocument = Cart & Document;

@Schema()
export class CartItem {
  @ApiProperty({
    description: 'Cart item ID',
    example: '6851049b3275028c0623b486',
    required: false
  })
  @Prop()
  _id?: string;

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

  @Prop()
  color: string;

  @Prop()
  size: string;
}

@Schema({ timestamps: true })
export class Cart {
  @ApiProperty({
    description: 'Cart ID',
    example: '684b24e040546dacba4d3d98',
  })
  @Prop()
  _id: string;

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

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-03-20T10:30:00.000Z',
  })
  @Prop()
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-03-20T10:30:00.000Z',
  })
  @Prop()
  updatedAt: Date;
}

export const CartSchema = SchemaFactory.createForClass(Cart); 