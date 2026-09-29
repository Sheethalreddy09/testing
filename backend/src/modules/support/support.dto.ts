import {
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsEnum,
  IsUUID,
  Matches,
} from 'class-validator';
import { SupportPriority, SupportStatus } from '@prisma/client';
export class CreateSupportDto {
  @IsString() @MinLength(3) @MaxLength(160) subject!: string;
  @IsString() @MinLength(5) @MaxLength(5000) description!: string;
  @IsUUID() requesterId!: string;
  @IsOptional() @IsUUID() organisationId?: string;
  @IsOptional() @IsEnum(SupportPriority) priority: SupportPriority = SupportPriority.NORMAL;
}
export class UpdateSupportDto {
  @IsString() @MinLength(5) @MaxLength(5000) @Matches(/\S/) message!: string;
  @IsOptional() @IsEnum(SupportStatus) status?: SupportStatus;
  @IsOptional() @IsUUID() assignedToId?: string;
}
