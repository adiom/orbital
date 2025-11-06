CREATE TABLE IF NOT EXISTS "Sfera" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"ownerId" uuid NOT NULL,
	"visibility" varchar DEFAULT 'private' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "SferaForkedChat" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sferaId" uuid NOT NULL,
	"parentMessageId" uuid NOT NULL,
	"chatId" uuid NOT NULL,
	"title" text,
	"createdById" uuid NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "SferaForkedChat_chatId_unique" UNIQUE("chatId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "SferaMember" (
	"sferaId" uuid NOT NULL,
	"userId" uuid NOT NULL,
	"role" varchar DEFAULT 'member' NOT NULL,
	"joinedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "SferaMember_sferaId_userId_pk" PRIMARY KEY("sferaId","userId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "SferaMessage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sferaId" uuid NOT NULL,
	"userId" uuid NOT NULL,
	"content" text NOT NULL,
	"parentMessageId" uuid,
	"isForked" boolean DEFAULT false NOT NULL,
	"forkCount" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Sfera" ADD CONSTRAINT "Sfera_ownerId_User_id_fk" FOREIGN KEY ("ownerId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "SferaForkedChat" ADD CONSTRAINT "SferaForkedChat_sferaId_Sfera_id_fk" FOREIGN KEY ("sferaId") REFERENCES "public"."Sfera"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "SferaForkedChat" ADD CONSTRAINT "SferaForkedChat_parentMessageId_SferaMessage_id_fk" FOREIGN KEY ("parentMessageId") REFERENCES "public"."SferaMessage"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "SferaForkedChat" ADD CONSTRAINT "SferaForkedChat_chatId_Chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."Chat"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "SferaForkedChat" ADD CONSTRAINT "SferaForkedChat_createdById_User_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "SferaMember" ADD CONSTRAINT "SferaMember_sferaId_Sfera_id_fk" FOREIGN KEY ("sferaId") REFERENCES "public"."Sfera"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "SferaMember" ADD CONSTRAINT "SferaMember_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "SferaMessage" ADD CONSTRAINT "SferaMessage_sferaId_Sfera_id_fk" FOREIGN KEY ("sferaId") REFERENCES "public"."Sfera"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "SferaMessage" ADD CONSTRAINT "SferaMessage_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
