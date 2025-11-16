CREATE TABLE IF NOT EXISTS "ApiKey" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"keyHash" varchar(255) NOT NULL,
	"prefix" varchar(32) NOT NULL,
	"permissions" jsonb DEFAULT '{"resources":true,"tools":false,"admin":false}'::jsonb NOT NULL,
	"lastUsedAt" timestamp,
	"lastUsedIp" varchar(45),
	"usageCount" integer DEFAULT 0 NOT NULL,
	"expiresAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"revokedAt" timestamp,
	CONSTRAINT "ApiKey_keyHash_unique" UNIQUE("keyHash")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "McpAuditLog" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"apiKeyId" uuid NOT NULL,
	"userId" uuid NOT NULL,
	"method" varchar(100) NOT NULL,
	"resourceUri" text,
	"toolName" varchar(100),
	"params" jsonb,
	"statusCode" integer NOT NULL,
	"responseTimeMs" integer NOT NULL,
	"errorMessage" text,
	"ipAddress" varchar(45) NOT NULL,
	"userAgent" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "name" varchar(255);--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "displayName" varchar(100);--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "avatarUrl" text;--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "bio" text;--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "mcpEnabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "mcpQuota" jsonb;--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "createdAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "updatedAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "McpAuditLog" ADD CONSTRAINT "McpAuditLog_apiKeyId_ApiKey_id_fk" FOREIGN KEY ("apiKeyId") REFERENCES "public"."ApiKey"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "McpAuditLog" ADD CONSTRAINT "McpAuditLog_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
