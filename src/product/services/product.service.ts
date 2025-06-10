import { Injectable, Inject, OnModuleInit } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { Observable } from 'rxjs';

export interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  image: string;
}

export interface IProductService {
  getProduct(request: { id: string }): Observable<Product>;
}

@Injectable()
export class ProductService implements OnModuleInit {
  private productService: IProductService;

  constructor(@Inject('PRODUCT_PACKAGE') private client: ClientGrpc) {}

  onModuleInit() {
    this.productService = this.client.getService<IProductService>('ProductService');
  }

  getProduct(id: string): Observable<Product> {
    return this.productService.getProduct({ id });
  }
} 