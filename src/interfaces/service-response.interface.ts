export interface AuthResponse {
  isValid: boolean;
  userId: string;
}

export interface ProductResponse {
  id: string;
  price: number;
  inStock: boolean;
  success: boolean;
}
