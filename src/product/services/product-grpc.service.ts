import { Injectable, OnModuleInit, Inject } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { Observable, of } from 'rxjs';

interface ProductService {
  GetProduct(request: { id: string }): Observable<{
    code: number;
    status: string;
    timestamp: string;
    data: string;
    error: string;
  }>;
}

@Injectable()
export class ProductGrpcService implements OnModuleInit {
  private productService: ProductService;

  constructor(
    @Inject('PRODUCT_PACKAGE') private client: ClientGrpc,
  ) {}

  onModuleInit() {
    this.productService = this.client.getService<ProductService>('ProductService');
  }

  getProduct(productId: string): Observable<{
    code: number;
    status: string;
    timestamp: string;
    data: string;
    error: string;
  }> {
    return this.productService.GetProduct({ id: productId });
  }
} 