-- CreateEnum
CREATE TYPE "VerificationDecision" AS ENUM ('APPROVE', 'REJECT', 'REQUEST_INFORMATION');

-- CreateEnum
CREATE TYPE "SupportStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'ESCALATED', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "SupportPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "NotificationCategory" AS ENUM ('PLATFORM', 'VERIFICATION', 'MODERATION', 'TOKEN', 'PAYMENT', 'SUPPORT', 'SECURITY');

-- CreateEnum
CREATE TYPE "ModerationAction" AS ENUM ('APPROVE', 'RESTRICT', 'SUSPEND', 'RESTORE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "OrganisationStatus" ADD VALUE 'REJECTED';
ALTER TYPE "OrganisationStatus" ADD VALUE 'MORE_INFORMATION_REQUIRED';

-- CreateTable
CREATE TABLE "organisation_verifications" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "decision" "VerificationDecision" NOT NULL,
    "previousStatus" "OrganisationStatus" NOT NULL,
    "nextStatus" "OrganisationStatus" NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organisation_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organisation_invitations" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organisation_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_cases" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "organisationId" TEXT,
    "assignedToId" TEXT,
    "status" "SupportStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "SupportPriority" NOT NULL DEFAULT 'NORMAL',
    "escalatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_activities" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "previousStatus" "SupportStatus",
    "nextStatus" "SupportStatus",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "category" "NotificationCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "requiredPermission" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_moderation" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" "ModerationAction" NOT NULL,
    "reason" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_moderation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "organisation_verifications_organisationId_createdAt_idx" ON "organisation_verifications"("organisationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "organisation_invitations_tokenHash_key" ON "organisation_invitations"("tokenHash");

-- CreateIndex
CREATE INDEX "organisation_invitations_organisationId_email_idx" ON "organisation_invitations"("organisationId", "email");

-- CreateIndex
CREATE INDEX "organisation_invitations_expiresAt_idx" ON "organisation_invitations"("expiresAt");

-- CreateIndex
CREATE INDEX "support_cases_status_priority_createdAt_idx" ON "support_cases"("status", "priority", "createdAt");

-- CreateIndex
CREATE INDEX "support_cases_organisationId_idx" ON "support_cases"("organisationId");

-- CreateIndex
CREATE INDEX "support_cases_requesterId_idx" ON "support_cases"("requesterId");

-- CreateIndex
CREATE INDEX "support_activities_caseId_createdAt_idx" ON "support_activities"("caseId", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_recipientId_readAt_createdAt_idx" ON "notifications"("recipientId", "readAt", "createdAt");

-- CreateIndex
CREATE INDEX "job_moderation_jobId_createdAt_idx" ON "job_moderation"("jobId", "createdAt");

-- CreateIndex
CREATE INDEX "job_moderation_organisationId_createdAt_idx" ON "job_moderation"("organisationId", "createdAt");

-- AddForeignKey
ALTER TABLE "organisation_verifications" ADD CONSTRAINT "organisation_verifications_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organisation_verifications" ADD CONSTRAINT "organisation_verifications_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organisation_invitations" ADD CONSTRAINT "organisation_invitations_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organisation_invitations" ADD CONSTRAINT "organisation_invitations_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_cases" ADD CONSTRAINT "support_cases_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_cases" ADD CONSTRAINT "support_cases_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_cases" ADD CONSTRAINT "support_cases_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_activities" ADD CONSTRAINT "support_activities_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "support_cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_activities" ADD CONSTRAINT "support_activities_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_moderation" ADD CONSTRAINT "job_moderation_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_moderation" ADD CONSTRAINT "job_moderation_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Protect ledger invariants even if future writers omit application validation.
ALTER TABLE "organisation_token_balances" ADD CONSTRAINT "token_balance_nonnegative" CHECK ("balance" >= 0 AND "reservedTokens" >= 0 AND "reservedTokens" <= "balance");
ALTER TABLE "token_transactions" ADD CONSTRAINT "token_ledger_arithmetic" CHECK ("balanceAfter" = "balanceBefore" + "amount" AND "balanceAfter" >= 0);
