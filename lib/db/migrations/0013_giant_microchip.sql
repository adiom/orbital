-- First, drop constraint from Chat table
ALTER TABLE "Chat" DROP CONSTRAINT IF EXISTS "Chat_areaId_Area_id_fk";
--> statement-breakpoint
-- Then drop the areaId column from Chat
ALTER TABLE "Chat" DROP COLUMN IF EXISTS "areaId";
--> statement-breakpoint
-- Now drop dependent tables
DROP TABLE IF EXISTS "AreaMergeProposal";
--> statement-breakpoint
DROP TABLE IF EXISTS "AreaDocument";
--> statement-breakpoint
DROP TABLE IF EXISTS "AreaMember";
--> statement-breakpoint
-- Finally drop the Area table
DROP TABLE IF EXISTS "Area";