CREATE TABLE IF NOT EXISTS "AgentConfig" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agentId" varchar(64) NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"model" varchar(100),
	"temperature" double precision,
	"maxSteps" integer,
	"tools" jsonb,
	"rateLimit" jsonb,
	"mcpEndpoint" text,
	"lastCheckAt" timestamp,
	"lastCheckOk" boolean,
	"lastCheckMs" integer,
	"lastCheckError" text,
	"updatedById" uuid,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "AgentConfig_agentId_unique" UNIQUE("agentId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "AgentPromptVersion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agentId" varchar(64) NOT NULL,
	"version" integer NOT NULL,
	"prompt" text NOT NULL,
	"note" text,
	"authorId" uuid,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "agent_prompt_version_agent_id_version_key" UNIQUE("agentId","version")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "AgentConfig" ADD CONSTRAINT "AgentConfig_updatedById_User_id_fk" FOREIGN KEY ("updatedById") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "AgentPromptVersion" ADD CONSTRAINT "AgentPromptVersion_authorId_User_id_fk" FOREIGN KEY ("authorId") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_prompt_version_agent_id_idx" ON "AgentPromptVersion" USING btree ("agentId","version");