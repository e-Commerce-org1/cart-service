export interface UserIdRequest {
  userId: string;
}

export interface CartItem {
  productId: string;
  quantity: number;
  color: string;
  size: string;
  name: string;
  price: number;
  image: string;
}

export interface CartDetailsResponse {
  items: CartItem[];
  totalAmount: number;
}

export interface ClearCartResponse {
  success: boolean;
}
