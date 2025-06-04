import { CartItem } from './cart.interface';

export interface AddItemRequest {
  userId: string;
  item: CartItem;
}

export interface RemoveItemRequest {
  userId: string;
  productId: string;
}

export interface UpdateItemRequest {
  userId: string;
  productId: string;
  quantity: number;
}

export interface GetCartRequest {
  userId: string;
}

export interface ClearCartRequest {
  userId: string;
} 