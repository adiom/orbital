CREATE TABLE IF NOT EXISTS "SferaArtifact" (
	"sferaId" uuid NOT NULL,
	"documentId" uuid NOT NULL,
	"documentCreatedAt" timestamp NOT NULL,
	"createdByMessageId" uuid NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "SferaArtifact_sferaId_documentId_pk" PRIMARY KEY("sferaId","documentId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "SferaForkedSfera" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parentSferaId" uuid NOT NULL,
	"parentMessageId" uuid NOT NULL,
	"forkedSferaId" uuid NOT NULL,
	"createdById" uuid NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "SferaForkedSfera_forkedSferaId_unique" UNIQUE("forkedSferaId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ToolExecution" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"toolName" varchar(255) NOT NULL,
	"sferaId" uuid,
	"chatId" uuid,
	"userId" uuid NOT NULL,
	"input" jsonb NOT NULL,
	"output" jsonb,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"errorMessage" text,
	"executedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP TABLE IF EXISTS "SferaForkedChat";--> statement-breakpoint
DROP TABLE IF EXISTS "Vote_v2";--> statement-breakpoint
DROP TABLE IF EXISTS "Vote";--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "SferaMessage" ADD COLUMN IF NOT EXISTS "attachments" json DEFAULT '[]'::json NOT NULL;
EXCEPTION
 WHEN duplicate_column THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "SferaMessage" ADD COLUMN IF NOT EXISTS "toolResults" json DEFAULT '[]'::json NOT NULL;
EXCEPTION
 WHEN duplicate_column THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "SferaArtifact" ADD CONSTRAINT "SferaArtifact_sferaId_Sfera_id_fk" FOREIGN KEY ("sferaId") REFERENCES "public"."Sfera"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "SferaArtifact" ADD CONSTRAINT "SferaArtifact_createdByMessageId_SferaMessage_id_fk" FOREIGN KEY ("createdByMessageId") REFERENCES "public"."SferaMessage"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "SferaArtifact" ADD CONSTRAINT "SferaArtifact_documentId_documentCreatedAt_Document_id_createdAt_fk" FOREIGN KEY ("documentId","documentCreatedAt") REFERENCES "public"."Document"("id","createdAt") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "SferaForkedSfera" ADD CONSTRAINT "SferaForkedSfera_parentSferaId_Sfera_id_fk" FOREIGN KEY ("parentSferaId") REFERENCES "public"."Sfera"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "SferaForkedSfera" ADD CONSTRAINT "SferaForkedSfera_parentMessageId_SferaMessage_id_fk" FOREIGN KEY ("parentMessageId") REFERENCES "public"."SferaMessage"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "SferaForkedSfera" ADD CONSTRAINT "SferaForkedSfera_forkedSferaId_Sfera_id_fk" FOREIGN KEY ("forkedSferaId") REFERENCES "public"."Sfera"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "SferaForkedSfera" ADD CONSTRAINT "SferaForkedSfera_createdById_User_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ToolExecution" ADD CONSTRAINT "ToolExecution_sferaId_Sfera_id_fk" FOREIGN KEY ("sferaId") REFERENCES "public"."Sfera"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ToolExecution" ADD CONSTRAINT "ToolExecution_chatId_Chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."Chat"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ToolExecution" ADD CONSTRAINT "ToolExecution_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
