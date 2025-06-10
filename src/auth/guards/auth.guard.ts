import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { lastValueFrom } from 'rxjs';
import { AuthGrpcService } from '../services/auth-grpc.service';
import { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user?: {
    entityId: string;
  };
}

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  constructor(private readonly authService: AuthGrpcService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      this.logger.warn('No token provided in request');
      throw new UnauthorizedException('No token provided');
    }

    try {
      this.logger.debug('Validating token...');
      const response = await lastValueFrom(this.authService.validateToken(token));
      
      if (!response.isValid) {
        this.logger.warn('Invalid token provided');
        throw new UnauthorizedException('Invalid token');
      }

      this.logger.debug(`Token validated for user: ${response.entityId}`);
      // Attach only entityId to the request
      request.user = {
        entityId: response.entityId,
      };

      return true;
    } catch (error) {
      this.logger.error('Token validation failed', error.stack);
      throw new UnauthorizedException('Invalid token');
    }
  }

  private extractTokenFromHeader(request: AuthenticatedRequest): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
