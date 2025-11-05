CREATE TABLE IF NOT EXISTS "Area" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdAt" timestamp NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"ownerId" uuid NOT NULL,
	"visibility" varchar DEFAULT 'private' NOT NULL,
	"daoTokenAddress" text,
	"parentAreaId" uuid,
	"inheritedSummary" text,
	"forkedAt" timestamp,
	"mergeStatus" varchar DEFAULT 'independent'
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "AreaDocument" (
	"areaId" uuid NOT NULL,
	"documentId" uuid NOT NULL,
	"documentCreatedAt" timestamp NOT NULL,
	"addedAt" timestamp NOT NULL,
	CONSTRAINT "AreaDocument_areaId_documentId_pk" PRIMARY KEY("areaId","documentId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "AreaMember" (
	"areaId" uuid NOT NULL,
	"userId" uuid NOT NULL,
	"role" varchar DEFAULT 'member' NOT NULL,
	"joinedAt" timestamp NOT NULL,
	CONSTRAINT "AreaMember_areaId_userId_pk" PRIMARY KEY("areaId","userId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "AreaMergeProposal" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sourceAreaId" uuid NOT NULL,
	"targetAreaId" uuid NOT NULL,
	"createdBy" uuid NOT NULL,
	"createdAt" timestamp NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"changesSummary" text,
	"status" varchar DEFAULT 'open' NOT NULL,
	"reviewedBy" uuid,
	"reviewedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ChatMember" (
	"chatId" uuid NOT NULL,
	"userId" uuid NOT NULL,
	"role" varchar DEFAULT 'member' NOT NULL,
	"joinedAt" timestamp NOT NULL,
	"lastReadAt" timestamp,
	CONSTRAINT "ChatMember_chatId_userId_pk" PRIMARY KEY("chatId","userId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "MessageMention" (
	"messageId" uuid NOT NULL,
	"mentionedUserId" uuid,
	"isAiMention" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp NOT NULL,
	CONSTRAINT "MessageMention_messageId_mentionedUserId_pk" PRIMARY KEY("messageId","mentionedUserId")
);
--> statement-breakpoint
ALTER TABLE "Chat" ADD COLUMN "areaId" uuid;--> statement-breakpoint
ALTER TABLE "Chat" ADD COLUMN "chatType" varchar DEFAULT 'personal' NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Area" ADD CONSTRAINT "Area_ownerId_User_id_fk" FOREIGN KEY ("ownerId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Area" ADD CONSTRAINT "Area_parentAreaId_Area_id_fk" FOREIGN KEY ("parentAreaId") REFERENCES "public"."Area"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "AreaDocument" ADD CONSTRAINT "AreaDocument_areaId_Area_id_fk" FOREIGN KEY ("areaId") REFERENCES "public"."Area"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "AreaDocument" ADD CONSTRAINT "AreaDocument_documentId_documentCreatedAt_Document_id_createdAt_fk" FOREIGN KEY ("documentId","documentCreatedAt") REFERENCES "public"."Document"("id","createdAt") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "AreaMember" ADD CONSTRAINT "AreaMember_areaId_Area_id_fk" FOREIGN KEY ("areaId") REFERENCES "public"."Area"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "AreaMember" ADD CONSTRAINT "AreaMember_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "AreaMergeProposal" ADD CONSTRAINT "AreaMergeProposal_sourceAreaId_Area_id_fk" FOREIGN KEY ("sourceAreaId") REFERENCES "public"."Area"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "AreaMergeProposal" ADD CONSTRAINT "AreaMergeProposal_targetAreaId_Area_id_fk" FOREIGN KEY ("targetAreaId") REFERENCES "public"."Area"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "AreaMergeProposal" ADD CONSTRAINT "AreaMergeProposal_createdBy_User_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "AreaMergeProposal" ADD CONSTRAINT "AreaMergeProposal_reviewedBy_User_id_fk" FOREIGN KEY ("reviewedBy") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ChatMember" ADD CONSTRAINT "ChatMember_chatId_Chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."Chat"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ChatMember" ADD CONSTRAINT "ChatMember_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "MessageMention" ADD CONSTRAINT "MessageMention_messageId_Message_v2_id_fk" FOREIGN KEY ("messageId") REFERENCES "public"."Message_v2"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "MessageMention" ADD CONSTRAINT "MessageMention_mentionedUserId_User_id_fk" FOREIGN KEY ("mentionedUserId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Chat" ADD CONSTRAINT "Chat_areaId_Area_id_fk" FOREIGN KEY ("areaId") REFERENCES "public"."Area"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
