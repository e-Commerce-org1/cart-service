export interface UserIdRequest {
  userId: string;
}

export interface CartItem {
  productId: string;
  description: string;
  color: string;
  size: string;
  quantity: number;
  price: number;
}

export interface CartDetailsResponse {
  items: CartItem[];
}

export interface ClearCartResponse {
  success: boolean;
}
