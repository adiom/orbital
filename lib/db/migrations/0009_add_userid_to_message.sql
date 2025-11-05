-- Add userId column to Message_v2 table for tracking message authors in group chats
ALTER TABLE "Message_v2" ADD COLUMN "userId" uuid;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Message_v2" ADD CONSTRAINT "Message_v2_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
