-- 0012_add_attachments_to_sfera_message.sql
ALTER TABLE "SferaMessage" 
ADD COLUMN IF NOT EXISTS "attachments" JSONB NOT NULL DEFAULT '[]'::jsonb;