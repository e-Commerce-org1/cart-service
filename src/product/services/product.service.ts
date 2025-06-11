import { Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { ProductGrpcService } from './product-grpc.service';

@Injectable()
export class ProductService {
  constructor(private readonly productGrpcService: ProductGrpcService) {}

  getProduct(productId: string): Observable<{
    code: number;
    status: string;
    timestamp: string;
    data: string;
    error: string;
  }> {
    return this.productGrpcService.getProduct(productId);
  }
} 