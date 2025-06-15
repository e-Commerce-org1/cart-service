import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ICacheService, ICacheOptions } from '../interfaces/cache.interface';

@Injectable()
export class RedisService implements ICacheService {
  private readonly logger = new Logger(RedisService.name);
  private readonly defaultOptions: ICacheOptions = {
    ttl: 3600, // 1 hour
    prefix: 'cache:'
  };

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async get<T>(key: string): Promise<T | undefined> {
    try {
      const fullKey = this.getFullKey(key);
      const value = await this.cacheManager.get<T>(fullKey);
      
      if (value) {
        this.logger.debug(`Cache hit for key: ${fullKey}`);
      } else {
        this.logger.debug(`Cache miss for key: ${fullKey}`);
      }
      
      return value;
    } catch (error) {
      this.logger.error(`Error getting cache for key ${key}: ${error.message}`);
      return undefined;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const fullKey = this.getFullKey(key);
      await this.cacheManager.set(fullKey, value, ttl || this.defaultOptions.ttl);
      this.logger.debug(`Cache set for key: ${fullKey}`);
    } catch (error) {
      this.logger.error(`Error setting cache for key ${key}: ${error.message}`);
    }
  }

  async del(key: string): Promise<void> {
    try {
      const fullKey = this.getFullKey(key);
      await this.cacheManager.del(fullKey);
      this.logger.debug(`Cache deleted for key: ${fullKey}`);
    } catch (error) {
      this.logger.error(`Error deleting cache for key ${key}: ${error.message}`);
    }
  }

  private getFullKey(key: string): string {
    return `${this.defaultOptions.prefix}${key}`;
  }
} 