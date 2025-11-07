-- Migration: Add AI Tools support tables and update Document kinds
-- Created: 2025-11-07

-- Add new artifact types to Document kind enum
ALTER TABLE "Document" DROP CONSTRAINT IF EXISTS "Document_kind_check";
ALTER TABLE "Document" ADD CONSTRAINT "Document_kind_check"
  CHECK (kind IN ('text', 'code', 'image', 'sheet', 'mini-app', 'chart', 'game'));

-- Create ToolExecution table for tracking AI tool invocations
CREATE TABLE IF NOT EXISTS "ToolExecution" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "toolName" varchar(255) NOT NULL,
  "sferaId" uuid REFERENCES "Sfera"("id") ON DELETE CASCADE,
  "chatId" uuid REFERENCES "Chat"("id") ON DELETE CASCADE,
  "userId" uuid NOT NULL REFERENCES "User"("id"),
  "input" jsonb NOT NULL,
  "output" jsonb,
  "status" varchar DEFAULT 'pending' NOT NULL,
  "errorMessage" text,
  "executedAt" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "ToolExecution_status_check" CHECK (status IN ('pending', 'success', 'error'))
);

-- Create SferaArtifact table for linking artifacts to Sfera discussions
CREATE TABLE IF NOT EXISTS "SferaArtifact" (
  "sferaId" uuid NOT NULL REFERENCES "Sfera"("id") ON DELETE CASCADE,
  "documentId" uuid NOT NULL,
  "documentCreatedAt" timestamp NOT NULL,
  "createdByMessageId" uuid NOT NULL REFERENCES "SferaMessage"("id") ON DELETE CASCADE,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  PRIMARY KEY ("sferaId", "documentId", "documentCreatedAt"),
  FOREIGN KEY ("documentId", "documentCreatedAt") REFERENCES "Document"("id", "createdAt")
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "idx_tool_execution_sfera" ON "ToolExecution"("sferaId");
CREATE INDEX IF NOT EXISTS "idx_tool_execution_chat" ON "ToolExecution"("chatId");
CREATE INDEX IF NOT EXISTS "idx_tool_execution_user" ON "ToolExecution"("userId");
CREATE INDEX IF NOT EXISTS "idx_tool_execution_status" ON "ToolExecution"("status");
CREATE INDEX IF NOT EXISTS "idx_sfera_artifact_sfera" ON "SferaArtifact"("sferaId");
CREATE INDEX IF NOT EXISTS "idx_sfera_artifact_message" ON "SferaArtifact"("createdByMessageId");
