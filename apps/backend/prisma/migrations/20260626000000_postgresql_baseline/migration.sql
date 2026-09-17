-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('INTERN_SERVER', 'IMMEDIATE_SUPERVISOR', 'CESAD_MEMBER', 'COMMISSION_ASSISTANT', 'HOMOLOGATION_AUTHORITY', 'ADMIN');

-- CreateEnum
CREATE TYPE "ProcessStatus" AS ENUM ('EM_AVALIACAO', 'AGUARDANDO_ASSINATURA', 'ASSINADO', 'EM_ANALISE_CESAD', 'PARECER_EMITIDO', 'HOMOLOGADO', 'NOTIFICADO', 'CIENTE', 'ENCERRADO');

-- CreateEnum
CREATE TYPE "AuditEventType" AS ENUM ('PROCESS_CREATED', 'STAGE_ACTIVATED', 'EVALUATION_STARTED', 'EVALUATION_DRAFT_SAVED', 'EVALUATION_COMPLETED', 'EVALUATION_RECTIFIED', 'CESAD_STAGE_OPINION_STARTED', 'CESAD_STAGE_OPINION_DRAFT_SAVED', 'CESAD_STAGE_OPINION_COMPLETED', 'CESAD_STAGE_ASSIGNMENT_SUPERSEDED', 'CESAD_FINAL_OPINION_STARTED', 'CESAD_FINAL_OPINION_DRAFT_SAVED', 'CESAD_FINAL_OPINION_COMPLETED', 'CESAD_FINAL_OPINION_SIGNED', 'SIGNATURE_REQUESTED', 'DOCUMENT_SIGNED', 'SELF_EVALUATION_SUBMITTED', 'SENT_TO_CESAD', 'CESAD_OPINION_STARTED', 'CESAD_OPINION_ISSUED', 'CESAD_OPINION_SIGNED', 'ADJUSTMENT_REQUESTED', 'STAGE_COMPLETED', 'SENT_TO_HOMOLOGATION', 'RESULT_HOMOLOGATED', 'DOCUMENT_GENERATED', 'NOTIFICATION_SENT', 'ACKNOWLEDGEMENT_RECORDED', 'PROCESS_CLOSED');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('SUPERVISOR_EVALUATION', 'SELF_EVALUATION', 'CESAD_OPINION', 'HOMOLOGATION_RECORD', 'RESULT_NOTIFICATION', 'ACKNOWLEDGEMENT_RECORD', 'ORDINANCE');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('DRAFT', 'CONSOLIDATED', 'READY_FOR_SIGNATURE', 'SIGNED', 'INVALIDATED_OR_SUPERSEDED');

-- CreateEnum
CREATE TYPE "CesadOpinionKind" AS ENUM ('STAGE', 'FINAL_CONCLUSIVE');

-- CreateEnum
CREATE TYPE "SignatureProvider" AS ENUM ('INTERNAL', 'GOVBR', 'OTHER');

-- CreateEnum
CREATE TYPE "SignatureStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'CANCELED');

-- CreateEnum
CREATE TYPE "SupervisorEvaluationStatus" AS ENUM ('DRAFT', 'SUBMITTED');

-- CreateEnum
CREATE TYPE "SelfEvaluationStatus" AS ENUM ('DRAFT', 'SUBMITTED');

-- CreateEnum
CREATE TYPE "CesadStageOpinionStatus" AS ENUM ('DRAFT', 'COMPLETED');

-- CreateEnum
CREATE TYPE "CesadFinalOpinionStatus" AS ENUM ('DRAFT', 'COMPLETED');

-- CreateEnum
CREATE TYPE "CesadCommissionStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "CesadStageAssignmentStatus" AS ENUM ('ACTIVE', 'SUPERSEDED', 'CANCELED');

-- CreateEnum
CREATE TYPE "CesadCommissionActType" AS ENUM ('CONSTITUTION', 'AMENDMENT', 'RENEWAL');

-- CreateEnum
CREATE TYPE "CesadCommissionMemberRoleType" AS ENUM ('TITULAR', 'SUPLENTE');

-- CreateEnum
CREATE TYPE "CesadStageOpinionExpectedSignerDerivationType" AS ENUM ('ACTIVE_TITULAR', 'EXPLICIT_SUBSTITUTION');

-- CreateEnum
CREATE TYPE "CesadStageOpinionSigningCapacity" AS ENUM ('EFFECTIVE_MEMBER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "refreshTokenHash" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "revokedReason" TEXT,
    "rotatedAt" TIMESTAMP(3),
    "replacedBySessionId" TEXT,
    "lastUsedAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluationProcess" (
    "id" TEXT NOT NULL,
    "evaluatedUserId" TEXT NOT NULL,
    "status" "ProcessStatus" NOT NULL DEFAULT 'EM_AVALIACAO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvaluationProcess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessStage" (
    "id" TEXT NOT NULL,
    "evaluationProcessId" TEXT NOT NULL,
    "responsibleSupervisorUserId" TEXT,
    "sequence" INTEGER NOT NULL,
    "stageCode" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcessStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "evaluationProcessId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "actorRole" "UserRole",
    "eventType" "AuditEventType" NOT NULL,
    "beforeState" JSONB,
    "afterState" JSONB,
    "metadata" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessDocument" (
    "id" TEXT NOT NULL,
    "evaluationProcessId" TEXT NOT NULL,
    "processStageId" TEXT,
    "documentType" "DocumentType" NOT NULL,
    "opinionKind" "CesadOpinionKind",
    "documentStatus" "DocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "artifactPath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcessDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupervisorEvaluation" (
    "id" TEXT NOT NULL,
    "processId" TEXT NOT NULL,
    "processStageId" TEXT NOT NULL,
    "evaluatorUserId" TEXT NOT NULL,
    "status" "SupervisorEvaluationStatus" NOT NULL DEFAULT 'DRAFT',
    "summary" TEXT NOT NULL,
    "generalComments" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupervisorEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SelfEvaluation" (
    "id" TEXT NOT NULL,
    "processId" TEXT NOT NULL,
    "processStageId" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "status" "SelfEvaluationStatus" NOT NULL DEFAULT 'DRAFT',
    "selfReflection" TEXT NOT NULL,
    "additionalNotes" TEXT,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SelfEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CesadStageOpinion" (
    "id" TEXT NOT NULL,
    "processId" TEXT NOT NULL,
    "processStageId" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "status" "CesadStageOpinionStatus" NOT NULL DEFAULT 'DRAFT',
    "reportText" TEXT NOT NULL,
    "legalBasis" TEXT,
    "conclusion" TEXT NOT NULL,
    "stageConcept" TEXT,
    "stageResult" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CesadStageOpinion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CesadFinalOpinion" (
    "id" TEXT NOT NULL,
    "processId" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "status" "CesadFinalOpinionStatus" NOT NULL DEFAULT 'DRAFT',
    "reportText" TEXT NOT NULL,
    "legalBasis" TEXT,
    "finalConclusion" TEXT NOT NULL,
    "finalResult" TEXT,
    "finalConcept" TEXT,
    "recommendation" TEXT,
    "consolidatedSnapshot" JSONB,
    "completedAt" TIMESTAMP(3),
    "sentToHomologationAt" TIMESTAMP(3),
    "sentToHomologationByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CesadFinalOpinion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CesadCommission" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "CesadCommissionStatus" NOT NULL DEFAULT 'ACTIVE',
    "effectiveStartDate" TIMESTAMP(3) NOT NULL,
    "effectiveEndDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CesadCommission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CesadCommissionAct" (
    "id" TEXT NOT NULL,
    "commissionId" TEXT NOT NULL,
    "actType" "CesadCommissionActType" NOT NULL,
    "number" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "signedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "validityStartDate" TIMESTAMP(3),
    "validityEndDate" TIMESTAMP(3),
    "summary" TEXT,
    "referenceText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CesadCommissionAct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CesadCommissionMember" (
    "id" TEXT NOT NULL,
    "commissionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "actId" TEXT,
    "roleType" "CesadCommissionMemberRoleType" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CesadCommissionMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CesadStageOpinionExpectedSigner" (
    "id" TEXT NOT NULL,
    "cesadStageOpinionId" TEXT NOT NULL,
    "commissionId" TEXT NOT NULL,
    "actingCommissionMemberId" TEXT NOT NULL,
    "actingUserId" TEXT NOT NULL,
    "derivationType" "CesadStageOpinionExpectedSignerDerivationType" NOT NULL,
    "signingCapacity" "CesadStageOpinionSigningCapacity" NOT NULL,
    "substitutedCommissionMemberId" TEXT,
    "nameSnapshot" TEXT NOT NULL,
    "emailSnapshot" TEXT NOT NULL,
    "roleTypeSnapshot" "CesadCommissionMemberRoleType" NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "frozenAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CesadStageOpinionExpectedSigner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CesadFinalOpinionExpectedSigner" (
    "id" TEXT NOT NULL,
    "cesadFinalOpinionId" TEXT NOT NULL,
    "commissionId" TEXT NOT NULL,
    "actingCommissionMemberId" TEXT NOT NULL,
    "actingUserId" TEXT NOT NULL,
    "derivationType" "CesadStageOpinionExpectedSignerDerivationType" NOT NULL,
    "signingCapacity" "CesadStageOpinionSigningCapacity" NOT NULL,
    "substitutedCommissionMemberId" TEXT,
    "nameSnapshot" TEXT NOT NULL,
    "emailSnapshot" TEXT NOT NULL,
    "roleTypeSnapshot" "CesadCommissionMemberRoleType" NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "frozenAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CesadFinalOpinionExpectedSigner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CesadStageAssignment" (
    "id" TEXT NOT NULL,
    "processId" TEXT NOT NULL,
    "processStageId" TEXT NOT NULL,
    "commissionId" TEXT NOT NULL,
    "status" "CesadStageAssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "assignedAt" TIMESTAMP(3) NOT NULL,
    "assignedByUserId" TEXT,
    "assignmentReason" TEXT,
    "referenceDate" TIMESTAMP(3) NOT NULL,
    "supersededAt" TIMESTAMP(3),
    "supersededByAssignmentId" TEXT,
    "supersededReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CesadStageAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SignatureRecord" (
    "id" TEXT NOT NULL,
    "processDocumentId" TEXT NOT NULL,
    "signatoryUserId" TEXT NOT NULL,
    "signatoryRole" "UserRole" NOT NULL,
    "provider" "SignatureProvider" NOT NULL,
    "status" "SignatureStatus" NOT NULL DEFAULT 'PENDING',
    "externalReference" TEXT,
    "signedAt" TIMESTAMP(3),
    "cesadStageOpinionExpectedSignerId" TEXT,
    "cesadFinalOpinionExpectedSignerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SignatureRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UserSession_refreshTokenHash_key" ON "UserSession"("refreshTokenHash");

-- CreateIndex
CREATE INDEX "UserSession_userId_idx" ON "UserSession"("userId");

-- CreateIndex
CREATE INDEX "UserSession_familyId_idx" ON "UserSession"("familyId");

-- CreateIndex
CREATE INDEX "UserSession_userId_familyId_idx" ON "UserSession"("userId", "familyId");

-- CreateIndex
CREATE INDEX "UserSession_expiresAt_idx" ON "UserSession"("expiresAt");

-- CreateIndex
CREATE INDEX "UserSession_revokedAt_idx" ON "UserSession"("revokedAt");

-- CreateIndex
CREATE INDEX "EvaluationProcess_evaluatedUserId_idx" ON "EvaluationProcess"("evaluatedUserId");

-- CreateIndex
CREATE INDEX "EvaluationProcess_status_idx" ON "EvaluationProcess"("status");

-- CreateIndex
CREATE INDEX "ProcessStage_evaluationProcessId_idx" ON "ProcessStage"("evaluationProcessId");

-- CreateIndex
CREATE INDEX "ProcessStage_responsibleSupervisorUserId_idx" ON "ProcessStage"("responsibleSupervisorUserId");

-- CreateIndex
CREATE INDEX "ProcessStage_stageCode_idx" ON "ProcessStage"("stageCode");

-- CreateIndex
CREATE UNIQUE INDEX "ProcessStage_evaluationProcessId_sequence_key" ON "ProcessStage"("evaluationProcessId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "ProcessStage_evaluationProcessId_stageCode_key" ON "ProcessStage"("evaluationProcessId", "stageCode");

-- CreateIndex
CREATE INDEX "AuditEvent_evaluationProcessId_occurredAt_idx" ON "AuditEvent"("evaluationProcessId", "occurredAt");

-- CreateIndex
CREATE INDEX "AuditEvent_actorUserId_idx" ON "AuditEvent"("actorUserId");

-- CreateIndex
CREATE INDEX "AuditEvent_eventType_idx" ON "AuditEvent"("eventType");

-- CreateIndex
CREATE INDEX "ProcessDocument_evaluationProcessId_idx" ON "ProcessDocument"("evaluationProcessId");

-- CreateIndex
CREATE INDEX "ProcessDocument_processStageId_idx" ON "ProcessDocument"("processStageId");

-- CreateIndex
CREATE INDEX "ProcessDocument_documentType_documentStatus_idx" ON "ProcessDocument"("documentType", "documentStatus");

-- CreateIndex
CREATE INDEX "ProcessDocument_opinionKind_idx" ON "ProcessDocument"("opinionKind");

-- CreateIndex
CREATE UNIQUE INDEX "ProcessDocument_evaluationProcessId_processStageId_document_key" ON "ProcessDocument"("evaluationProcessId", "processStageId", "documentType");

-- CreateIndex
CREATE UNIQUE INDEX "SupervisorEvaluation_processStageId_key" ON "SupervisorEvaluation"("processStageId");

-- CreateIndex
CREATE INDEX "SupervisorEvaluation_processId_idx" ON "SupervisorEvaluation"("processId");

-- CreateIndex
CREATE INDEX "SupervisorEvaluation_evaluatorUserId_idx" ON "SupervisorEvaluation"("evaluatorUserId");

-- CreateIndex
CREATE INDEX "SupervisorEvaluation_status_idx" ON "SupervisorEvaluation"("status");

-- CreateIndex
CREATE UNIQUE INDEX "SupervisorEvaluation_processId_processStageId_key" ON "SupervisorEvaluation"("processId", "processStageId");

-- CreateIndex
CREATE UNIQUE INDEX "SelfEvaluation_processStageId_key" ON "SelfEvaluation"("processStageId");

-- CreateIndex
CREATE INDEX "SelfEvaluation_processId_idx" ON "SelfEvaluation"("processId");

-- CreateIndex
CREATE INDEX "SelfEvaluation_authorUserId_idx" ON "SelfEvaluation"("authorUserId");

-- CreateIndex
CREATE INDEX "SelfEvaluation_status_idx" ON "SelfEvaluation"("status");

-- CreateIndex
CREATE UNIQUE INDEX "SelfEvaluation_processId_processStageId_key" ON "SelfEvaluation"("processId", "processStageId");

-- CreateIndex
CREATE UNIQUE INDEX "CesadStageOpinion_processStageId_key" ON "CesadStageOpinion"("processStageId");

-- CreateIndex
CREATE INDEX "CesadStageOpinion_processId_idx" ON "CesadStageOpinion"("processId");

-- CreateIndex
CREATE INDEX "CesadStageOpinion_authorUserId_idx" ON "CesadStageOpinion"("authorUserId");

-- CreateIndex
CREATE INDEX "CesadStageOpinion_status_idx" ON "CesadStageOpinion"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CesadFinalOpinion_processId_key" ON "CesadFinalOpinion"("processId");

-- CreateIndex
CREATE INDEX "CesadFinalOpinion_authorUserId_idx" ON "CesadFinalOpinion"("authorUserId");

-- CreateIndex
CREATE INDEX "CesadFinalOpinion_sentToHomologationByUserId_idx" ON "CesadFinalOpinion"("sentToHomologationByUserId");

-- CreateIndex
CREATE INDEX "CesadFinalOpinion_status_idx" ON "CesadFinalOpinion"("status");

-- CreateIndex
CREATE INDEX "CesadCommission_status_idx" ON "CesadCommission"("status");

-- CreateIndex
CREATE INDEX "CesadCommission_effectiveStartDate_idx" ON "CesadCommission"("effectiveStartDate");

-- CreateIndex
CREATE INDEX "CesadCommissionAct_commissionId_idx" ON "CesadCommissionAct"("commissionId");

-- CreateIndex
CREATE INDEX "CesadCommissionAct_actType_idx" ON "CesadCommissionAct"("actType");

-- CreateIndex
CREATE INDEX "CesadCommissionAct_year_idx" ON "CesadCommissionAct"("year");

-- CreateIndex
CREATE INDEX "CesadCommissionMember_commissionId_idx" ON "CesadCommissionMember"("commissionId");

-- CreateIndex
CREATE INDEX "CesadCommissionMember_userId_idx" ON "CesadCommissionMember"("userId");

-- CreateIndex
CREATE INDEX "CesadCommissionMember_actId_idx" ON "CesadCommissionMember"("actId");

-- CreateIndex
CREATE INDEX "CesadCommissionMember_roleType_idx" ON "CesadCommissionMember"("roleType");

-- CreateIndex
CREATE INDEX "CesadCommissionMember_startDate_idx" ON "CesadCommissionMember"("startDate");

-- CreateIndex
CREATE INDEX "CesadStageOpinionExpectedSigner_cesadStageOpinionId_idx" ON "CesadStageOpinionExpectedSigner"("cesadStageOpinionId");

-- CreateIndex
CREATE INDEX "CesadStageOpinionExpectedSigner_commissionId_idx" ON "CesadStageOpinionExpectedSigner"("commissionId");

-- CreateIndex
CREATE INDEX "CesadStageOpinionExpectedSigner_actingCommissionMemberId_idx" ON "CesadStageOpinionExpectedSigner"("actingCommissionMemberId");

-- CreateIndex
CREATE INDEX "CesadStageOpinionExpectedSigner_actingUserId_idx" ON "CesadStageOpinionExpectedSigner"("actingUserId");

-- CreateIndex
CREATE INDEX "CesadStageOpinionExpectedSigner_substitutedCommissionMember_idx" ON "CesadStageOpinionExpectedSigner"("substitutedCommissionMemberId");

-- CreateIndex
CREATE INDEX "CesadStageOpinionExpectedSigner_derivationType_idx" ON "CesadStageOpinionExpectedSigner"("derivationType");

-- CreateIndex
CREATE UNIQUE INDEX "CesadStageOpinionExpectedSigner_cesadStageOpinionId_actingC_key" ON "CesadStageOpinionExpectedSigner"("cesadStageOpinionId", "actingCommissionMemberId");

-- CreateIndex
CREATE UNIQUE INDEX "CesadStageOpinionExpectedSigner_cesadStageOpinionId_sortOrd_key" ON "CesadStageOpinionExpectedSigner"("cesadStageOpinionId", "sortOrder");

-- CreateIndex
CREATE INDEX "CesadFinalOpinionExpectedSigner_cesadFinalOpinionId_idx" ON "CesadFinalOpinionExpectedSigner"("cesadFinalOpinionId");

-- CreateIndex
CREATE INDEX "CesadFinalOpinionExpectedSigner_commissionId_idx" ON "CesadFinalOpinionExpectedSigner"("commissionId");

-- CreateIndex
CREATE INDEX "CesadFinalOpinionExpectedSigner_actingCommissionMemberId_idx" ON "CesadFinalOpinionExpectedSigner"("actingCommissionMemberId");

-- CreateIndex
CREATE INDEX "CesadFinalOpinionExpectedSigner_actingUserId_idx" ON "CesadFinalOpinionExpectedSigner"("actingUserId");

-- CreateIndex
CREATE INDEX "CesadFinalOpinionExpectedSigner_substitutedCommissionMember_idx" ON "CesadFinalOpinionExpectedSigner"("substitutedCommissionMemberId");

-- CreateIndex
CREATE INDEX "CesadFinalOpinionExpectedSigner_derivationType_idx" ON "CesadFinalOpinionExpectedSigner"("derivationType");

-- CreateIndex
CREATE UNIQUE INDEX "CesadFinalOpinionExpectedSigner_cesadFinalOpinionId_actingC_key" ON "CesadFinalOpinionExpectedSigner"("cesadFinalOpinionId", "actingCommissionMemberId");

-- CreateIndex
CREATE UNIQUE INDEX "CesadFinalOpinionExpectedSigner_cesadFinalOpinionId_sortOrd_key" ON "CesadFinalOpinionExpectedSigner"("cesadFinalOpinionId", "sortOrder");

-- CreateIndex
CREATE INDEX "CesadStageAssignment_processId_idx" ON "CesadStageAssignment"("processId");

-- CreateIndex
CREATE INDEX "CesadStageAssignment_processStageId_idx" ON "CesadStageAssignment"("processStageId");

-- CreateIndex
CREATE INDEX "CesadStageAssignment_commissionId_idx" ON "CesadStageAssignment"("commissionId");

-- CreateIndex
CREATE INDEX "CesadStageAssignment_assignedByUserId_idx" ON "CesadStageAssignment"("assignedByUserId");

-- CreateIndex
CREATE INDEX "CesadStageAssignment_supersededByAssignmentId_idx" ON "CesadStageAssignment"("supersededByAssignmentId");

-- CreateIndex
CREATE INDEX "CesadStageAssignment_status_idx" ON "CesadStageAssignment"("status");

-- CreateIndex
CREATE INDEX "CesadStageAssignment_processStageId_status_idx" ON "CesadStageAssignment"("processStageId", "status");

-- CreateIndex
CREATE INDEX "SignatureRecord_processDocumentId_idx" ON "SignatureRecord"("processDocumentId");

-- CreateIndex
CREATE INDEX "SignatureRecord_signatoryUserId_idx" ON "SignatureRecord"("signatoryUserId");

-- CreateIndex
CREATE INDEX "SignatureRecord_cesadStageOpinionExpectedSignerId_idx" ON "SignatureRecord"("cesadStageOpinionExpectedSignerId");

-- CreateIndex
CREATE INDEX "SignatureRecord_cesadFinalOpinionExpectedSignerId_idx" ON "SignatureRecord"("cesadFinalOpinionExpectedSignerId");

-- CreateIndex
CREATE INDEX "SignatureRecord_status_idx" ON "SignatureRecord"("status");

-- CreateIndex
CREATE UNIQUE INDEX "SignatureRecord_processDocumentId_signatoryUserId_signatory_key" ON "SignatureRecord"("processDocumentId", "signatoryUserId", "signatoryRole");

-- CreateIndex
CREATE UNIQUE INDEX "SignatureRecord_cesadStageOpinionExpectedSignerId_key" ON "SignatureRecord"("cesadStageOpinionExpectedSignerId");

-- CreateIndex
CREATE UNIQUE INDEX "SignatureRecord_cesadFinalOpinionExpectedSignerId_key" ON "SignatureRecord"("cesadFinalOpinionExpectedSignerId");

-- AddForeignKey
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationProcess" ADD CONSTRAINT "EvaluationProcess_evaluatedUserId_fkey" FOREIGN KEY ("evaluatedUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessStage" ADD CONSTRAINT "ProcessStage_evaluationProcessId_fkey" FOREIGN KEY ("evaluationProcessId") REFERENCES "EvaluationProcess"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessStage" ADD CONSTRAINT "ProcessStage_responsibleSupervisorUserId_fkey" FOREIGN KEY ("responsibleSupervisorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_evaluationProcessId_fkey" FOREIGN KEY ("evaluationProcessId") REFERENCES "EvaluationProcess"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessDocument" ADD CONSTRAINT "ProcessDocument_evaluationProcessId_fkey" FOREIGN KEY ("evaluationProcessId") REFERENCES "EvaluationProcess"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessDocument" ADD CONSTRAINT "ProcessDocument_processStageId_fkey" FOREIGN KEY ("processStageId") REFERENCES "ProcessStage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupervisorEvaluation" ADD CONSTRAINT "SupervisorEvaluation_processId_fkey" FOREIGN KEY ("processId") REFERENCES "EvaluationProcess"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupervisorEvaluation" ADD CONSTRAINT "SupervisorEvaluation_processStageId_fkey" FOREIGN KEY ("processStageId") REFERENCES "ProcessStage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupervisorEvaluation" ADD CONSTRAINT "SupervisorEvaluation_evaluatorUserId_fkey" FOREIGN KEY ("evaluatorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SelfEvaluation" ADD CONSTRAINT "SelfEvaluation_processId_fkey" FOREIGN KEY ("processId") REFERENCES "EvaluationProcess"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SelfEvaluation" ADD CONSTRAINT "SelfEvaluation_processStageId_fkey" FOREIGN KEY ("processStageId") REFERENCES "ProcessStage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SelfEvaluation" ADD CONSTRAINT "SelfEvaluation_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CesadStageOpinion" ADD CONSTRAINT "CesadStageOpinion_processId_fkey" FOREIGN KEY ("processId") REFERENCES "EvaluationProcess"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CesadStageOpinion" ADD CONSTRAINT "CesadStageOpinion_processStageId_fkey" FOREIGN KEY ("processStageId") REFERENCES "ProcessStage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CesadStageOpinion" ADD CONSTRAINT "CesadStageOpinion_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CesadFinalOpinion" ADD CONSTRAINT "CesadFinalOpinion_processId_fkey" FOREIGN KEY ("processId") REFERENCES "EvaluationProcess"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CesadFinalOpinion" ADD CONSTRAINT "CesadFinalOpinion_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CesadFinalOpinion" ADD CONSTRAINT "CesadFinalOpinion_sentToHomologationByUserId_fkey" FOREIGN KEY ("sentToHomologationByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CesadCommissionAct" ADD CONSTRAINT "CesadCommissionAct_commissionId_fkey" FOREIGN KEY ("commissionId") REFERENCES "CesadCommission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CesadCommissionMember" ADD CONSTRAINT "CesadCommissionMember_commissionId_fkey" FOREIGN KEY ("commissionId") REFERENCES "CesadCommission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CesadCommissionMember" ADD CONSTRAINT "CesadCommissionMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CesadCommissionMember" ADD CONSTRAINT "CesadCommissionMember_actId_fkey" FOREIGN KEY ("actId") REFERENCES "CesadCommissionAct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CesadStageOpinionExpectedSigner" ADD CONSTRAINT "CesadStageOpinionExpectedSigner_cesadStageOpinionId_fkey" FOREIGN KEY ("cesadStageOpinionId") REFERENCES "CesadStageOpinion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CesadStageOpinionExpectedSigner" ADD CONSTRAINT "CesadStageOpinionExpectedSigner_commissionId_fkey" FOREIGN KEY ("commissionId") REFERENCES "CesadCommission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CesadStageOpinionExpectedSigner" ADD CONSTRAINT "CesadStageOpinionExpectedSigner_actingCommissionMemberId_fkey" FOREIGN KEY ("actingCommissionMemberId") REFERENCES "CesadCommissionMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CesadStageOpinionExpectedSigner" ADD CONSTRAINT "CesadStageOpinionExpectedSigner_substitutedCommissionMembe_fkey" FOREIGN KEY ("substitutedCommissionMemberId") REFERENCES "CesadCommissionMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CesadStageOpinionExpectedSigner" ADD CONSTRAINT "CesadStageOpinionExpectedSigner_actingUserId_fkey" FOREIGN KEY ("actingUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CesadFinalOpinionExpectedSigner" ADD CONSTRAINT "CesadFinalOpinionExpectedSigner_cesadFinalOpinionId_fkey" FOREIGN KEY ("cesadFinalOpinionId") REFERENCES "CesadFinalOpinion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CesadFinalOpinionExpectedSigner" ADD CONSTRAINT "CesadFinalOpinionExpectedSigner_commissionId_fkey" FOREIGN KEY ("commissionId") REFERENCES "CesadCommission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CesadFinalOpinionExpectedSigner" ADD CONSTRAINT "CesadFinalOpinionExpectedSigner_actingCommissionMemberId_fkey" FOREIGN KEY ("actingCommissionMemberId") REFERENCES "CesadCommissionMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CesadFinalOpinionExpectedSigner" ADD CONSTRAINT "CesadFinalOpinionExpectedSigner_substitutedCommissionMembe_fkey" FOREIGN KEY ("substitutedCommissionMemberId") REFERENCES "CesadCommissionMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CesadFinalOpinionExpectedSigner" ADD CONSTRAINT "CesadFinalOpinionExpectedSigner_actingUserId_fkey" FOREIGN KEY ("actingUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CesadStageAssignment" ADD CONSTRAINT "CesadStageAssignment_processId_fkey" FOREIGN KEY ("processId") REFERENCES "EvaluationProcess"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CesadStageAssignment" ADD CONSTRAINT "CesadStageAssignment_processStageId_fkey" FOREIGN KEY ("processStageId") REFERENCES "ProcessStage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CesadStageAssignment" ADD CONSTRAINT "CesadStageAssignment_commissionId_fkey" FOREIGN KEY ("commissionId") REFERENCES "CesadCommission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CesadStageAssignment" ADD CONSTRAINT "CesadStageAssignment_assignedByUserId_fkey" FOREIGN KEY ("assignedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CesadStageAssignment" ADD CONSTRAINT "CesadStageAssignment_supersededByAssignmentId_fkey" FOREIGN KEY ("supersededByAssignmentId") REFERENCES "CesadStageAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignatureRecord" ADD CONSTRAINT "SignatureRecord_processDocumentId_fkey" FOREIGN KEY ("processDocumentId") REFERENCES "ProcessDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignatureRecord" ADD CONSTRAINT "SignatureRecord_signatoryUserId_fkey" FOREIGN KEY ("signatoryUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignatureRecord" ADD CONSTRAINT "SignatureRecord_cesadStageOpinionExpectedSignerId_fkey" FOREIGN KEY ("cesadStageOpinionExpectedSignerId") REFERENCES "CesadStageOpinionExpectedSigner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignatureRecord" ADD CONSTRAINT "SignatureRecord_cesadFinalOpinionExpectedSignerId_fkey" FOREIGN KEY ("cesadFinalOpinionExpectedSignerId") REFERENCES "CesadFinalOpinionExpectedSigner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
