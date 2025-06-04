export interface CartItem {
  productId: string;
  quantity: number;
  price: number;
}

export interface Cart {
  userId: string;
  items: CartItem[];
  totalAmount: number;
}

export interface CartResponse {
  cart: Cart | null;
  message: string;
  success: boolean;
} 