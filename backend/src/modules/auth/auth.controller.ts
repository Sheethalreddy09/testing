import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { PlatformLoginDto } from './dto/platform-login.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('platform/login')
  @HttpCode(HttpStatus.OK)
  async platformLogin(@Body() dto: PlatformLoginDto, @Req() req: Request) {
    return this.authService.loginPlatform(dto, this.requestContext(req));
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() actor: AuthenticatedUser) {
    return this.authService.getCurrentUser(actor);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.authService.logout(
      this.extractBearerToken(req),
      actor,
      this.requestContext(req),
    );
  }

  private extractBearerToken(req: Request): string {
    const header = req.headers.authorization || '';
    return header.startsWith('Bearer ') ? header.slice(7) : '';
  }

  private requestContext(req: Request) {
    const forwarded = req.headers['x-forwarded-for'];
    const ipAddress = Array.isArray(forwarded)
      ? forwarded[0]
      : forwarded?.split(',')[0]?.trim() || req.ip || req.socket?.remoteAddress;

    return {
      ipAddress,
      userAgent: req.headers['user-agent'],
    };
  }
}
