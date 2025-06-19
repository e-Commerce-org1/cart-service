import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ProductIdProperty, CartItemQuantityProperty, PriceProperty, UserIdProperty, ItemsProperty } from '../swagger/properties';

export type CartDocument = Cart & Document;

@Schema()
export class CartItem {
  @ProductIdProperty()
  @Prop({ required: true })
  productId: string;

  @CartItemQuantityProperty()
  @Prop({ required: true, min: 1 })
  quantity: number;

  @Prop()
  color: string;

  @Prop()
  size: string;
}

@Schema({ timestamps: true })
export class Cart {
  @UserIdProperty()
  @Prop({ required: true })
  userId: string;

  @ItemsProperty(CartItem)
  @Prop({ type: [CartItem], default: [] })
  items: CartItem[];
}

export const CartSchema = SchemaFactory.createForClass(Cart); 