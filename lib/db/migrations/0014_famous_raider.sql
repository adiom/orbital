CREATE TABLE IF NOT EXISTS "AiUsageLog" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"sferaId" uuid,
	"messageId" uuid,
	"modelUsed" varchar(100) NOT NULL,
	"provider" varchar(50) DEFAULT 'openai' NOT NULL,
	"inputTokens" integer DEFAULT 0 NOT NULL,
	"outputTokens" integer DEFAULT 0 NOT NULL,
	"totalTokens" integer DEFAULT 0 NOT NULL,
	"toolName" varchar(100),
	"toolParameters" json,
	"toolExecutionTimeMs" integer,
	"estimatedCost" integer DEFAULT 0 NOT NULL,
	"status" varchar DEFAULT 'success' NOT NULL,
	"errorMessage" text,
	"contextSize" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "AiUsageLog" ADD CONSTRAINT "AiUsageLog_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "AiUsageLog" ADD CONSTRAINT "AiUsageLog_sferaId_Sfera_id_fk" FOREIGN KEY ("sferaId") REFERENCES "public"."Sfera"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "AiUsageLog" ADD CONSTRAINT "AiUsageLog_messageId_SferaMessage_id_fk" FOREIGN KEY ("messageId") REFERENCES "public"."SferaMessage"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
