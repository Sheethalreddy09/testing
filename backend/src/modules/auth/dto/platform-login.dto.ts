import {
  IsEmail,
  IsString,
  MaxLength,
  MinLength,
  IsOptional,
  IsIn,
  IsBoolean,
} from "class-validator";

import { Transform } from "class-transformer";

export class PlatformLoginDto {
  // Selection is checked against the stored role; it never assigns privileges.
  @IsOptional()
  @IsIn(["PLATFORM_SUPER_ADMIN", "PLATFORM_ADMIN"])
  expectedRole?: "PLATFORM_SUPER_ADMIN" | "PLATFORM_ADMIN";

  @IsOptional()
  @IsBoolean()
  @Transform(({ obj }) => obj.rememberMe)
  rememberMe?: boolean;

  @IsEmail()
  @MaxLength(254)
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;
}
