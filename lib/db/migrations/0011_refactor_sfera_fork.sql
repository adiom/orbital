-- Rename table
ALTER TABLE "SferaForkedChat" RENAME TO "SferaForkedSfera";

-- Rename columns
ALTER TABLE "SferaForkedSfera" RENAME COLUMN "sferaId" TO "parentSferaId";
ALTER TABLE "SferaForkedSfera" RENAME COLUMN "chatId" TO "forkedSferaId";

-- Drop title column
ALTER TABLE "SferaForkedSfera" DROP COLUMN "title";

-- Update foreign key constraint names (drop old, add new)
ALTER TABLE "SferaForkedSfera" DROP CONSTRAINT IF EXISTS "SferaForkedChat_sferaId_Sfera_id_fk";
ALTER TABLE "SferaForkedSfera" DROP CONSTRAINT IF EXISTS "SferaForkedChat_chatId_Chat_id_fk";
ALTER TABLE "SferaForkedSfera" DROP CONSTRAINT IF EXISTS "SferaForkedChat_chatId_unique";

-- Add new foreign key constraints
DO $$ BEGIN
 ALTER TABLE "SferaForkedSfera" ADD CONSTRAINT "SferaForkedSfera_parentSferaId_Sfera_id_fk" FOREIGN KEY ("parentSferaId") REFERENCES "public"."Sfera"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "SferaForkedSfera" ADD CONSTRAINT "SferaForkedSfera_forkedSferaId_Sfera_id_fk" FOREIGN KEY ("forkedSferaId") REFERENCES "public"."Sfera"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Add unique constraint on forkedSferaId
ALTER TABLE "SferaForkedSfera" ADD CONSTRAINT "SferaForkedSfera_forkedSferaId_unique" UNIQUE("forkedSferaId");
