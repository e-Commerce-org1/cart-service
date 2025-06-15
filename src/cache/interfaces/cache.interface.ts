export interface ICacheService {
  get<T>(key: string): Promise<T | undefined>;
  set(key: string, value: any, ttl?: number): Promise<void>;
  del(key: string): Promise<void>;
}

export interface ICacheOptions {
  ttl: number;
  prefix: string;
} 