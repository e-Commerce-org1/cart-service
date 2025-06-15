import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { RedisService } from './services/redis.service';
import { redisConfig } from '../config/redis.config';

@Module({
  imports: [
    CacheModule.register(redisConfig),
  ],
  providers: [RedisService],
  exports: [RedisService],
})
export class AppCacheModule {} 