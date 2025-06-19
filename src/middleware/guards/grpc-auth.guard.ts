import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { lastValueFrom } from 'rxjs';
import { AuthGrpcService } from '../services/auth-grpc.service';

@Injectable()
export class GrpcAuthGuard implements CanActivate {
  private readonly logger = new Logger(GrpcAuthGuard.name);

  constructor(private readonly authService: AuthGrpcService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ctx = context.switchToRpc().getContext();
    const metadata = ctx.get('metadata');
    const token = this.extractTokenFromMetadata(metadata);

    if (!token) {
      this.logger.warn('No token provided in gRPC metadata');
      throw new UnauthorizedException('No token provided');
    }

    try {
      this.logger.debug(`Validating token: ${token.substring(0, 20)}...`);
      const response = await lastValueFrom(this.authService.validateToken(token));
      if (!response.isValid) {
        this.logger.warn('Token validation failed: Invalid token');
        throw new UnauthorizedException('Invalid token');
      }
      this.logger.debug(`Token validated successfully for entityId: ${response.entityId}`);
      // Optionally attach user info to context if needed
      return true;
    } catch (error) {
      this.logger.error(`Token validation error: ${error.message}`, error.stack);
      throw new UnauthorizedException('Invalid token');
    }
  }

  private extractTokenFromMetadata(metadata: any): string | undefined {
    if (!metadata) return undefined;
    const authHeader = metadata.get('Authorization')?.[0] || metadata.get('authorization')?.[0];
    if (!authHeader) return undefined;
    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' ? token : undefined;
  }
} 