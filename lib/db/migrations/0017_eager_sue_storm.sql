CREATE TABLE IF NOT EXISTS "AgentRegistry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"userId" uuid NOT NULL,
	"email" varchar(255) NOT NULL,
	"webhookUrl" text NOT NULL,
	"webhookSecret" text NOT NULL,
	"authToken" text NOT NULL,
	"metadata" jsonb,
	"healthStatus" varchar(20) DEFAULT 'unknown' NOT NULL,
	"lastHealthCheck" timestamp,
	"failedWebhookCount" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "IdempotencyLog" (
	"key" varchar(255) PRIMARY KEY NOT NULL,
	"messageId" uuid NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"expiresAt" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "SferaMessage" ADD COLUMN "messageType" varchar DEFAULT 'user' NOT NULL;--> statement-breakpoint
ALTER TABLE "SferaMessage" ADD COLUMN "idempotencyKey" varchar(255);--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "AgentRegistry" ADD CONSTRAINT "AgentRegistry_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "IdempotencyLog" ADD CONSTRAINT "IdempotencyLog_messageId_SferaMessage_id_fk" FOREIGN KEY ("messageId") REFERENCES "public"."SferaMessage"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idempotency_log_expires_at_idx" ON "IdempotencyLog" USING btree ("expiresAt");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sfera_message_sfera_id_created_at_idx" ON "SferaMessage" USING btree ("sferaId","createdAt");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sfera_message_type_idx" ON "SferaMessage" USING btree ("messageType");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sfera_message_user_id_idx" ON "SferaMessage" USING btree ("userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sfera_message_idempotency_key_idx" ON "SferaMessage" USING btree ("idempotencyKey");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sfera_message_content_fulltext_idx" ON "SferaMessage" USING gin (to_tsvector('russian', "content"));