import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { Request, Response } from "express";
import {
  platformToken,
  PLATFORM_SESSION_COOKIE,
  platformCookieOptions,
} from "../../common/platform-session-cookie";
import { AuthService } from "./auth.service";
import { PlatformLoginDto } from "./dto/platform-login.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthenticatedUser } from "../../common/interfaces/authenticated-user.interface";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("platform/login")
  @HttpCode(HttpStatus.OK)
  async platformLogin(
    @Body() dto: PlatformLoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.loginPlatform(
      dto,
      this.requestContext(req),
    );
    if (dto.rememberMe) {
      res.cookie(PLATFORM_SESSION_COOKIE, result.accessToken, {
        ...platformCookieOptions(),
        maxAge: Math.max(0, new Date(result.expiresAt).getTime() - Date.now()),
      });
    } else res.clearCookie(PLATFORM_SESSION_COOKIE, platformCookieOptions());
    return result;
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() actor: AuthenticatedUser) {
    return this.authService.getCurrentUser(actor);
  }

  @Post("logout")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.clearCookie(PLATFORM_SESSION_COOKIE, platformCookieOptions());
    return this.authService.logout(
      platformToken(req),
      actor,
      this.requestContext(req),
    );
  }

  private requestContext(req: Request) {
    const forwarded = req.headers["x-forwarded-for"];
    const ipAddress = Array.isArray(forwarded)
      ? forwarded[0]
      : forwarded?.split(",")[0]?.trim() || req.ip || req.socket?.remoteAddress;

    return {
      ipAddress,
      userAgent: req.headers["user-agent"],
    };
  }
}
