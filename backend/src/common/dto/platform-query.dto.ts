import { IsInt, IsOptional, IsString, Max, MaxLength, Min, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
export class PlatformQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional() @IsString() @MaxLength(150) search?: string;
  @IsOptional() @IsString() @MaxLength(50) status?: string;
  @IsOptional() @IsString() @MaxLength(50) role?: string;
  @IsOptional() @IsString() @MaxLength(100) organisationId?: string;
  @IsOptional() @IsString() @MaxLength(50) category?: string;
  @IsOptional() @IsIn(['true', 'false']) unread?: string;
}
export const pagination = (q: PlatformQueryDto) => ({
  skip: ((q.page || 1) - 1) * (q.limit || 20),
  take: q.limit || 20,
});
export const paged = (data: unknown[], total: number, q: PlatformQueryDto) => ({
  data,
  meta: {
    total,
    page: q.page || 1,
    totalPages: Math.ceil(total / (q.limit || 20)),
    limit: q.limit || 20,
  },
});
