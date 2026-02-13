-- Generated from Prisma schema - Run this in Cloud SQL Studio or psql
-- Database: legacyre

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN', 'ANALYST', 'VIEWER', 'SUPER_ADMIN');
CREATE TYPE "PlanType" AS ENUM ('FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE');
CREATE TYPE "OrgRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER');
CREATE TYPE "PropertyType" AS ENUM ('RESIDENTIAL', 'MULTIFAMILY', 'INDUSTRIAL', 'MIXED_USE', 'LAND');
CREATE TYPE "ImageType" AS ENUM ('EXTERIOR', 'INTERIOR', 'AERIAL', 'FLOORPLAN', 'OTHER');
CREATE TYPE "ValuationStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED');
CREATE TYPE "Visibility" AS ENUM ('PRIVATE', 'ORGANIZATION', 'PUBLIC');
CREATE TYPE "ApprovalStatus" AS ENUM ('NOT_SUBMITTED', 'PENDING_REVIEW', 'APPROVED', 'REJECTED');
CREATE TYPE "ContentType" AS ENUM ('TEXT', 'HTML', 'MARKDOWN', 'JSON');
CREATE TYPE "Platform" AS ENUM ('VALORA', 'BUSINESS_NOW', 'LEGACY_CRM', 'HUB', 'VENUEVR', 'LOUD_WORKS');
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELED', 'INCOMPLETE', 'INCOMPLETE_EXPIRED', 'TRIALING', 'UNPAID');
CREATE TYPE "SubscriptionPlan" AS ENUM ('FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE');
CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'YEARLY');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED', 'CANCELED');
CREATE TYPE "ProjectStatus" AS ENUM ('PLANNING', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'ARCHIVED');
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'REVIEW', 'COMPLETED');
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'UNQUALIFIED', 'CONVERTED', 'LOST');
CREATE TYPE "LeadSource" AS ENUM ('WEBSITE', 'REFERRAL', 'EMAIL_CAMPAIGN', 'SOCIAL_MEDIA', 'COLD_CALL', 'EVENT', 'OTHER');
CREATE TYPE "DealStage" AS ENUM ('PROSPECTING', 'QUALIFICATION', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST');
CREATE TYPE "ActivityType" AS ENUM ('CALL', 'EMAIL', 'MEETING', 'TASK', 'NOTE');
CREATE TYPE "WorksOrgType" AS ENUM ('EMPLOYER', 'SPONSOR', 'UNIVERSITY', 'NONPROFIT');
CREATE TYPE "WorksBillingStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'INACTIVE');
CREATE TYPE "WorksOrgRole" AS ENUM ('OWNER', 'MANAGER', 'VIEWER', 'MEMBER');
CREATE TYPE "TalentVerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'SUSPENDED');
CREATE TYPE "SkillProficiency" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT');
CREATE TYPE "ProofType" AS ENUM ('LINK', 'FILE', 'TEXT', 'PROJECT', 'CERTIFICATE');
CREATE TYPE "WorksLocationType" AS ENUM ('REMOTE', 'ONSITE', 'HYBRID');
CREATE TYPE "WorksPayType" AS ENUM ('FIXED', 'HOURLY');
CREATE TYPE "WorksProjectStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'LIVE', 'PAUSED', 'FILLED', 'CLOSED', 'REJECTED');
CREATE TYPE "WorksApplicationStatus" AS ENUM ('SUBMITTED', 'SHORTLISTED', 'OFFERED', 'ACCEPTED', 'REJECTED', 'WITHDRAWN');
CREATE TYPE "WorksEngagementStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELED', 'DISPUTED');
CREATE TYPE "WorksMilestoneStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'NEEDS_REVISION', 'APPROVED');
CREATE TYPE "WorksSubmissionType" AS ENUM ('FILE', 'LINK', 'TEXT');
CREATE TYPE "WorksReviewStatus" AS ENUM ('PENDING', 'NEEDS_REVISION', 'APPROVED', 'REJECTED');
CREATE TYPE "WorksReportScope" AS ENUM ('ENGAGEMENT', 'ORGANIZATION', 'UNIVERSITY', 'SPONSOR');
CREATE TYPE "WorksExportStatus" AS ENUM ('DRAFT', 'EXPORTED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "logo" TEXT,
    "planType" "PlanType" NOT NULL DEFAULT 'FREE',
    "planExpiry" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrganizationMember" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "OrgRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrganizationMember_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Property" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT,
    "state" TEXT,
    "zip" TEXT,
    "country" TEXT DEFAULT 'USA',
    "propertyType" "PropertyType" NOT NULL,
    "subType" TEXT,
    "squareFeet" DOUBLE PRECISION,
    "units" INTEGER,
    "yearBuilt" INTEGER,
    "lotSize" DOUBLE PRECISION,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "aiConditionScore" DOUBLE PRECISION,
    "aiWearTearNotes" TEXT,
    "aiRecommendations" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PropertyImage" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "type" "ImageType" NOT NULL DEFAULT 'EXTERIOR',
    "aiAnalysis" TEXT,
    "aiTags" TEXT[],
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PropertyImage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Valuation" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT,
    "name" TEXT NOT NULL,
    "status" "ValuationStatus" NOT NULL DEFAULT 'DRAFT',
    "visibility" "Visibility" NOT NULL DEFAULT 'PRIVATE',
    "purchasePrice" DOUBLE PRECISION,
    "currentValue" DOUBLE PRECISION,
    "estimatedValue" DOUBLE PRECISION,
    "incomeData" JSONB,
    "expenseData" JSONB,
    "financingData" JSONB,
    "noi" DOUBLE PRECISION,
    "capRate" DOUBLE PRECISION,
    "irr" DOUBLE PRECISION,
    "cashOnCash" DOUBLE PRECISION,
    "dscr" DOUBLE PRECISION,
    "portfolioId" TEXT,
    "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'NOT_SUBMITTED',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "notes" TEXT,
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Valuation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ValuationScenario" (
    "id" TEXT NOT NULL,
    "valuationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "assumptions" JSONB NOT NULL,
    "results" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ValuationScenario_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Comparable" (
    "id" TEXT NOT NULL,
    "valuationId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "propertyType" "PropertyType" NOT NULL,
    "squareFeet" DOUBLE PRECISION,
    "salePrice" DOUBLE PRECISION NOT NULL,
    "saleDate" TIMESTAMP(3) NOT NULL,
    "capRate" DOUBLE PRECISION,
    "pricePerSF" DOUBLE PRECISION,
    "source" TEXT,
    "sourceUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Comparable_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Portfolio" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Portfolio_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MarketData" (
    "id" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zip" TEXT,
    "market" TEXT,
    "propertyType" "PropertyType" NOT NULL,
    "avgCapRate" DOUBLE PRECISION,
    "avgRentPSF" DOUBLE PRECISION,
    "vacancyRate" DOUBLE PRECISION,
    "absorption" DOUBLE PRECISION,
    "inventory" DOUBLE PRECISION,
    "period" TIMESTAMP(3) NOT NULL,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MarketData_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CMSContent" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "type" "ContentType" NOT NULL DEFAULT 'TEXT',
    "section" TEXT,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CMSContent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "folder" TEXT,
    "tags" TEXT[],
    "alt" TEXT,
    "caption" TEXT,
    "uploadedBy" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "organizationId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "details" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PropertyCache" (
    "id" TEXT NOT NULL,
    "addressHash" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zipCode" TEXT,
    "propertyType" TEXT,
    "bedrooms" INTEGER,
    "bathrooms" DOUBLE PRECISION,
    "squareFeet" INTEGER,
    "yearBuilt" INTEGER,
    "lotSizeSqft" DOUBLE PRECISION,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "lastSaleDate" TEXT,
    "lastSalePrice" DOUBLE PRECISION,
    "saleHistory" JSONB,
    "source" TEXT NOT NULL,
    "rawData" JSONB,
    "isComp" BOOLEAN NOT NULL DEFAULT false,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "hitCount" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "PropertyCache_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SystemConfig" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlatformAccess" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlatformAccess_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "planType" "SubscriptionPlan" NOT NULL,
    "billingCycle" "BillingCycle" NOT NULL DEFAULT 'MONTHLY',
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "stripePaymentMethodId" TEXT,
    "stripePriceId" TEXT,
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "canceledAt" TIMESTAMP(3),
    "trialStart" TIMESTAMP(3),
    "trialEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "PaymentStatus" NOT NULL,
    "stripePaymentIntentId" TEXT,
    "stripeChargeId" TEXT,
    "paymentMethod" TEXT,
    "last4" TEXT,
    "brand" TEXT,
    "invoiceUrl" TEXT,
    "receiptUrl" TEXT,
    "failureCode" TEXT,
    "failureMessage" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BusinessProject" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'PLANNING',
    "executiveSummary" TEXT,
    "marketAnalysis" TEXT,
    "financialPlan" JSONB,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BusinessProject_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BusinessTask" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BusinessTask_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BusinessMilestone" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "targetDate" TIMESTAMP(3) NOT NULL,
    "achieved" BOOLEAN NOT NULL DEFAULT false,
    "achievedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BusinessMilestone_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CRMLead" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "company" TEXT,
    "title" TEXT,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "source" "LeadSource" NOT NULL DEFAULT 'OTHER',
    "score" INTEGER,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zip" TEXT,
    "country" TEXT DEFAULT 'USA',
    "convertedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CRMLead_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CRMDeal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "leadId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "value" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "stage" "DealStage" NOT NULL DEFAULT 'PROSPECTING',
    "probability" INTEGER,
    "expectedCloseDate" TIMESTAMP(3),
    "actualCloseDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CRMDeal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CRMActivity" (
    "id" TEXT NOT NULL,
    "leadId" TEXT,
    "dealId" TEXT,
    "type" "ActivityType" NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CRMActivity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CRMNote" (
    "id" TEXT NOT NULL,
    "leadId" TEXT,
    "dealId" TEXT,
    "content" TEXT NOT NULL,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CRMNote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorksOrganization" (
    "id" TEXT NOT NULL,
    "type" "WorksOrgType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "industry" TEXT,
    "location" TEXT,
    "website" TEXT,
    "logo" TEXT,
    "billingStatus" "WorksBillingStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WorksOrganization_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorksOrgMember" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "roleInOrg" "WorksOrgRole" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorksOrgMember_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TalentProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "headline" TEXT,
    "bio" TEXT,
    "location" TEXT,
    "availabilityHoursWeek" INTEGER,
    "preferredCategories" TEXT[],
    "links" JSONB,
    "verificationStatus" "TalentVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TalentProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorksSkill" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorksSkill_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TalentSkill" (
    "id" TEXT NOT NULL,
    "talentProfileId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "proficiency" "SkillProficiency" NOT NULL DEFAULT 'INTERMEDIATE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TalentSkill_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProofItem" (
    "id" TEXT NOT NULL,
    "talentProfileId" TEXT NOT NULL,
    "type" "ProofType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "url" TEXT,
    "fileKey" TEXT,
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProofItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorksProject" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "locationType" "WorksLocationType" NOT NULL,
    "locationDetails" TEXT,
    "timeframeStart" TIMESTAMP(3),
    "timeframeEnd" TIMESTAMP(3),
    "estimatedHours" INTEGER,
    "payType" "WorksPayType" NOT NULL,
    "payAmount" DOUBLE PRECISION NOT NULL,
    "requirements" JSONB,
    "status" "WorksProjectStatus" NOT NULL DEFAULT 'DRAFT',
    "visibilityRules" JSONB,
    "createdByUserId" TEXT NOT NULL,
    "approvedByUserId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WorksProject_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorksApplication" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "talentUserId" TEXT NOT NULL,
    "note" TEXT,
    "aiMatchScore" DOUBLE PRECISION,
    "aiMatchReasons" JSONB,
    "status" "WorksApplicationStatus" NOT NULL DEFAULT 'SUBMITTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WorksApplication_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorksEngagement" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "talentUserId" TEXT NOT NULL,
    "partnerUserId" TEXT NOT NULL,
    "status" "WorksEngagementStatus" NOT NULL DEFAULT 'ACTIVE',
    "agreedPayType" "WorksPayType" NOT NULL,
    "agreedPayAmount" DOUBLE PRECISION NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WorksEngagement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorksMilestone" (
    "id" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueAt" TIMESTAMP(3),
    "status" "WorksMilestoneStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WorksMilestone_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorksSubmission" (
    "id" TEXT NOT NULL,
    "milestoneId" TEXT NOT NULL,
    "submittedByUserId" TEXT NOT NULL,
    "type" "WorksSubmissionType" NOT NULL,
    "contentRef" TEXT NOT NULL,
    "reviewStatus" "WorksReviewStatus" NOT NULL DEFAULT 'PENDING',
    "reviewNotes" TEXT,
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorksSubmission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorksOutcomeLog" (
    "id" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "hoursLogged" DOUBLE PRECISION,
    "skillsUsed" TEXT[],
    "skillsGained" TEXT[],
    "outcomeMetrics" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorksOutcomeLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorksFeedback" (
    "id" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "notes" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorksFeedback_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorksReport" (
    "id" TEXT NOT NULL,
    "scope" "WorksReportScope" NOT NULL,
    "scopeId" TEXT NOT NULL,
    "templateId" TEXT,
    "title" TEXT NOT NULL,
    "contentMarkdown" TEXT NOT NULL,
    "exportStatus" "WorksExportStatus" NOT NULL DEFAULT 'DRAFT',
    "exportedAt" TIMESTAMP(3),
    "exportUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WorksReport_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_email_idx" ON "User"("email");
CREATE INDEX "Account_userId_idx" ON "Account"("userId");
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");
CREATE INDEX "Organization_slug_idx" ON "Organization"("slug");
CREATE INDEX "OrganizationMember_organizationId_idx" ON "OrganizationMember"("organizationId");
CREATE INDEX "OrganizationMember_userId_idx" ON "OrganizationMember"("userId");
CREATE UNIQUE INDEX "OrganizationMember_organizationId_userId_key" ON "OrganizationMember"("organizationId", "userId");
CREATE INDEX "Property_address_idx" ON "Property"("address");
CREATE INDEX "Property_propertyType_idx" ON "Property"("propertyType");
CREATE INDEX "Property_city_state_idx" ON "Property"("city", "state");
CREATE INDEX "PropertyImage_propertyId_idx" ON "PropertyImage"("propertyId");
CREATE INDEX "Valuation_userId_idx" ON "Valuation"("userId");
CREATE INDEX "Valuation_organizationId_idx" ON "Valuation"("organizationId");
CREATE INDEX "Valuation_propertyId_idx" ON "Valuation"("propertyId");
CREATE INDEX "Valuation_status_idx" ON "Valuation"("status");
CREATE INDEX "ValuationScenario_valuationId_idx" ON "ValuationScenario"("valuationId");
CREATE INDEX "Comparable_valuationId_idx" ON "Comparable"("valuationId");
CREATE INDEX "Portfolio_organizationId_idx" ON "Portfolio"("organizationId");
CREATE INDEX "MarketData_city_state_idx" ON "MarketData"("city", "state");
CREATE INDEX "MarketData_propertyType_idx" ON "MarketData"("propertyType");
CREATE UNIQUE INDEX "MarketData_city_state_propertyType_period_key" ON "MarketData"("city", "state", "propertyType", "period");
CREATE UNIQUE INDEX "CMSContent_key_key" ON "CMSContent"("key");
CREATE INDEX "CMSContent_section_idx" ON "CMSContent"("section");
CREATE INDEX "MediaAsset_folder_idx" ON "MediaAsset"("folder");
CREATE INDEX "ActivityLog_userId_idx" ON "ActivityLog"("userId");
CREATE INDEX "ActivityLog_organizationId_idx" ON "ActivityLog"("organizationId");
CREATE INDEX "ActivityLog_action_idx" ON "ActivityLog"("action");
CREATE INDEX "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt");
CREATE UNIQUE INDEX "PropertyCache_addressHash_key" ON "PropertyCache"("addressHash");
CREATE INDEX "PropertyCache_city_state_idx" ON "PropertyCache"("city", "state");
CREATE INDEX "PropertyCache_zipCode_idx" ON "PropertyCache"("zipCode");
CREATE INDEX "PropertyCache_source_idx" ON "PropertyCache"("source");
CREATE INDEX "PropertyCache_expiresAt_idx" ON "PropertyCache"("expiresAt");
CREATE INDEX "PropertyCache_isComp_city_state_idx" ON "PropertyCache"("isComp", "city", "state");
CREATE UNIQUE INDEX "SystemConfig_key_key" ON "SystemConfig"("key");
CREATE INDEX "PlatformAccess_userId_idx" ON "PlatformAccess"("userId");
CREATE INDEX "PlatformAccess_platform_idx" ON "PlatformAccess"("platform");
CREATE UNIQUE INDEX "PlatformAccess_userId_platform_key" ON "PlatformAccess"("userId", "platform");
CREATE INDEX "Subscription_userId_idx" ON "Subscription"("userId");
CREATE INDEX "Subscription_platform_idx" ON "Subscription"("platform");
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");
CREATE INDEX "Subscription_stripeSubscriptionId_idx" ON "Subscription"("stripeSubscriptionId");
CREATE UNIQUE INDEX "Subscription_userId_platform_key" ON "Subscription"("userId", "platform");
CREATE UNIQUE INDEX "Payment_stripePaymentIntentId_key" ON "Payment"("stripePaymentIntentId");
CREATE UNIQUE INDEX "Payment_stripeChargeId_key" ON "Payment"("stripeChargeId");
CREATE INDEX "Payment_subscriptionId_idx" ON "Payment"("subscriptionId");
CREATE INDEX "Payment_status_idx" ON "Payment"("status");
CREATE INDEX "Payment_stripePaymentIntentId_idx" ON "Payment"("stripePaymentIntentId");
CREATE INDEX "BusinessProject_userId_idx" ON "BusinessProject"("userId");
CREATE INDEX "BusinessProject_status_idx" ON "BusinessProject"("status");
CREATE INDEX "BusinessTask_projectId_idx" ON "BusinessTask"("projectId");
CREATE INDEX "BusinessTask_status_idx" ON "BusinessTask"("status");
CREATE INDEX "BusinessMilestone_projectId_idx" ON "BusinessMilestone"("projectId");
CREATE INDEX "CRMLead_userId_idx" ON "CRMLead"("userId");
CREATE INDEX "CRMLead_status_idx" ON "CRMLead"("status");
CREATE INDEX "CRMLead_email_idx" ON "CRMLead"("email");
CREATE INDEX "CRMDeal_userId_idx" ON "CRMDeal"("userId");
CREATE INDEX "CRMDeal_leadId_idx" ON "CRMDeal"("leadId");
CREATE INDEX "CRMDeal_stage_idx" ON "CRMDeal"("stage");
CREATE INDEX "CRMActivity_leadId_idx" ON "CRMActivity"("leadId");
CREATE INDEX "CRMActivity_dealId_idx" ON "CRMActivity"("dealId");
CREATE INDEX "CRMActivity_type_idx" ON "CRMActivity"("type");
CREATE INDEX "CRMNote_leadId_idx" ON "CRMNote"("leadId");
CREATE INDEX "CRMNote_dealId_idx" ON "CRMNote"("dealId");
CREATE INDEX "WorksOrganization_type_idx" ON "WorksOrganization"("type");
CREATE INDEX "WorksOrganization_billingStatus_idx" ON "WorksOrganization"("billingStatus");
CREATE INDEX "WorksOrgMember_userId_idx" ON "WorksOrgMember"("userId");
CREATE INDEX "WorksOrgMember_organizationId_idx" ON "WorksOrgMember"("organizationId");
CREATE UNIQUE INDEX "WorksOrgMember_userId_organizationId_key" ON "WorksOrgMember"("userId", "organizationId");
CREATE UNIQUE INDEX "TalentProfile_userId_key" ON "TalentProfile"("userId");
CREATE INDEX "TalentProfile_userId_idx" ON "TalentProfile"("userId");
CREATE INDEX "TalentProfile_verificationStatus_idx" ON "TalentProfile"("verificationStatus");
CREATE UNIQUE INDEX "WorksSkill_name_key" ON "WorksSkill"("name");
CREATE INDEX "TalentSkill_talentProfileId_idx" ON "TalentSkill"("talentProfileId");
CREATE INDEX "TalentSkill_skillId_idx" ON "TalentSkill"("skillId");
CREATE UNIQUE INDEX "TalentSkill_talentProfileId_skillId_key" ON "TalentSkill"("talentProfileId", "skillId");
CREATE INDEX "ProofItem_talentProfileId_idx" ON "ProofItem"("talentProfileId");
CREATE INDEX "WorksProject_organizationId_idx" ON "WorksProject"("organizationId");
CREATE INDEX "WorksProject_status_idx" ON "WorksProject"("status");
CREATE INDEX "WorksProject_category_idx" ON "WorksProject"("category");
CREATE INDEX "WorksApplication_projectId_idx" ON "WorksApplication"("projectId");
CREATE INDEX "WorksApplication_talentUserId_idx" ON "WorksApplication"("talentUserId");
CREATE INDEX "WorksApplication_status_idx" ON "WorksApplication"("status");
CREATE UNIQUE INDEX "WorksApplication_projectId_talentUserId_key" ON "WorksApplication"("projectId", "talentUserId");
CREATE INDEX "WorksEngagement_projectId_idx" ON "WorksEngagement"("projectId");
CREATE INDEX "WorksEngagement_talentUserId_idx" ON "WorksEngagement"("talentUserId");
CREATE INDEX "WorksEngagement_status_idx" ON "WorksEngagement"("status");
CREATE INDEX "WorksMilestone_engagementId_idx" ON "WorksMilestone"("engagementId");
CREATE INDEX "WorksMilestone_status_idx" ON "WorksMilestone"("status");
CREATE INDEX "WorksSubmission_milestoneId_idx" ON "WorksSubmission"("milestoneId");
CREATE INDEX "WorksSubmission_reviewStatus_idx" ON "WorksSubmission"("reviewStatus");
CREATE INDEX "WorksOutcomeLog_engagementId_idx" ON "WorksOutcomeLog"("engagementId");
CREATE INDEX "WorksFeedback_engagementId_idx" ON "WorksFeedback"("engagementId");
CREATE INDEX "WorksFeedback_fromUserId_idx" ON "WorksFeedback"("fromUserId");
CREATE INDEX "WorksFeedback_toUserId_idx" ON "WorksFeedback"("toUserId");
CREATE INDEX "WorksReport_scope_scopeId_idx" ON "WorksReport"("scope", "scopeId");

-- Foreign Keys
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PropertyImage" ADD CONSTRAINT "PropertyImage_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Valuation" ADD CONSTRAINT "Valuation_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Valuation" ADD CONSTRAINT "Valuation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Valuation" ADD CONSTRAINT "Valuation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Valuation" ADD CONSTRAINT "Valuation_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ValuationScenario" ADD CONSTRAINT "ValuationScenario_valuationId_fkey" FOREIGN KEY ("valuationId") REFERENCES "Valuation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Comparable" ADD CONSTRAINT "Comparable_valuationId_fkey" FOREIGN KEY ("valuationId") REFERENCES "Valuation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Portfolio" ADD CONSTRAINT "Portfolio_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PlatformAccess" ADD CONSTRAINT "PlatformAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BusinessProject" ADD CONSTRAINT "BusinessProject_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BusinessTask" ADD CONSTRAINT "BusinessTask_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "BusinessProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BusinessMilestone" ADD CONSTRAINT "BusinessMilestone_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "BusinessProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CRMLead" ADD CONSTRAINT "CRMLead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CRMDeal" ADD CONSTRAINT "CRMDeal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CRMDeal" ADD CONSTRAINT "CRMDeal_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "CRMLead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CRMActivity" ADD CONSTRAINT "CRMActivity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "CRMLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CRMActivity" ADD CONSTRAINT "CRMActivity_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "CRMDeal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CRMNote" ADD CONSTRAINT "CRMNote_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "CRMLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CRMNote" ADD CONSTRAINT "CRMNote_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "CRMDeal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorksOrgMember" ADD CONSTRAINT "WorksOrgMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorksOrgMember" ADD CONSTRAINT "WorksOrgMember_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "WorksOrganization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TalentProfile" ADD CONSTRAINT "TalentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TalentSkill" ADD CONSTRAINT "TalentSkill_talentProfileId_fkey" FOREIGN KEY ("talentProfileId") REFERENCES "TalentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TalentSkill" ADD CONSTRAINT "TalentSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "WorksSkill"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProofItem" ADD CONSTRAINT "ProofItem_talentProfileId_fkey" FOREIGN KEY ("talentProfileId") REFERENCES "TalentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorksProject" ADD CONSTRAINT "WorksProject_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "WorksOrganization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorksApplication" ADD CONSTRAINT "WorksApplication_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "WorksProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorksApplication" ADD CONSTRAINT "WorksApplication_talentUserId_fkey" FOREIGN KEY ("talentUserId") REFERENCES "TalentProfile"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorksEngagement" ADD CONSTRAINT "WorksEngagement_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "WorksProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorksEngagement" ADD CONSTRAINT "WorksEngagement_talentUserId_fkey" FOREIGN KEY ("talentUserId") REFERENCES "TalentProfile"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorksMilestone" ADD CONSTRAINT "WorksMilestone_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "WorksEngagement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorksSubmission" ADD CONSTRAINT "WorksSubmission_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "WorksMilestone"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorksOutcomeLog" ADD CONSTRAINT "WorksOutcomeLog_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "WorksEngagement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorksFeedback" ADD CONSTRAINT "WorksFeedback_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "WorksEngagement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
