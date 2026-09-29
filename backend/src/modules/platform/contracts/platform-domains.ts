import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { PlatformQueryDto } from '../../../common/dto/platform-query.dto';
export const unavailable = (domain: string) => ({
  available: false as const,
  reason: `${domain} domain is not connected`,
});
// Replace these providers with adapters to the owning domain. All adapters MUST
// enforce actor/resource scope. Mutations must participate in the supplied transaction;
// a remote implementation must use an outbox, never claim success before commit.
export interface RecruitmentSummary {
  available: boolean;
  reason?: string;
  jobs?: number;
  applications?: number;
  interviews?: number;
  offers?: number;
  moderationQueue?: number;
}
export interface JobSummary {
  id: string;
  title: string;
  organisationId: string;
  status: string;
  reportsCount: number;
  createdAt: string;
}
export interface DomainPage<T> {
  available?: boolean;
  reason?: string;
  data: T[];
  meta: { total: number; page: number; totalPages: number };
}
export interface RecruitmentReportRow {
  organisationId: string;
  jobs: number;
  applications: number;
  interviews: number;
  offers: number;
}
export interface SaleSummary {
  referenceId: string;
  organisationId: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
}
export interface SalesResult {
  available: boolean;
  reason?: string;
  totals?: Array<{ currency: string; amount: number }>;
  data?: SaleSummary[];
  meta?: { total: number; page: number; totalPages: number };
}
export abstract class RecruitmentPort {
  abstract summary(actor: AuthenticatedUser, organisationId?: string): Promise<RecruitmentSummary>;
  abstract jobs(actor: AuthenticatedUser, query: PlatformQueryDto): Promise<DomainPage<JobSummary>>;
  abstract job(
    actor: AuthenticatedUser,
    id: string,
  ): Promise<{ id: string; organisationId: string }>;
  abstract moderate(
    tx: Prisma.TransactionClient,
    actor: AuthenticatedUser,
    id: string,
    action: string,
    reason: string,
  ): Promise<void>;
  abstract report(
    actor: AuthenticatedUser,
    query: PlatformQueryDto,
  ): Promise<DomainPage<RecruitmentReportRow>>;
}
@Injectable()
export class UnconnectedRecruitment extends RecruitmentPort {
  async summary() {
    return unavailable('Recruitment');
  }
  async jobs() {
    return { ...unavailable('Jobs'), data: [], meta: { total: 0, page: 1, totalPages: 0 } };
  }
  async job(): Promise<never> {
    throw new ServiceUnavailableException('Connect the shared Jobs domain before moderating jobs');
  }
  async moderate(): Promise<never> {
    throw new ServiceUnavailableException('Jobs domain is not connected');
  }
  async report() {
    return { ...unavailable('Recruitment'), data: [], meta: { total: 0, page: 1, totalPages: 0 } };
  }
}
export abstract class PaymentReportingPort {
  abstract sales(actor: AuthenticatedUser, query?: PlatformQueryDto): Promise<SalesResult>;
}
@Injectable()
export class UnconnectedPayments extends PaymentReportingPort {
  async sales() {
    return unavailable('Verified payments');
  }
}
