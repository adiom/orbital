-- This migration has already been applied
-- Skip if SferaForkedChat doesn't exist (it's already renamed)

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
DO $$ BEGIN
 ALTER TABLE "SferaForkedSfera" ADD CONSTRAINT "SferaForkedSfera_forkedSferaId_unique" UNIQUE("forkedSferaId");
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
