import { IsEmail, IsEnum, IsString, MaxLength, MinLength, Matches } from 'class-validator';
import { VerificationDecision } from '@prisma/client';
export class ReasonDto {
  @IsString() @MinLength(5) @MaxLength(1000) @Matches(/\S/) reason!: string;
}
export class VerifyOrganisationDto extends ReasonDto {
  @IsEnum(VerificationDecision) decision!: VerificationDecision;
}
export class InviteOrganisationDto {
  @IsEmail() @MaxLength(254) email!: string;
}
export class AcceptInvitationDto {
  @IsString() @Matches(/^[a-f0-9]{64}$/) token!: string;
  @IsString() @MinLength(12) @MaxLength(72) password!: string;
  @IsString() @MinLength(1) @MaxLength(80) firstName!: string;
  @IsString() @MinLength(1) @MaxLength(80) lastName!: string;
}
