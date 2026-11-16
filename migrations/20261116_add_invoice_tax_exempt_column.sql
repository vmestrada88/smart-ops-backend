-- Ensure Invoices.taxExempt exists (added to the model on 2025-12-31 without a migration;
-- databases created before that date fail on every invoice query/insert)
-- Safe to run multiple times
ALTER TABLE public."Invoices" ADD COLUMN IF NOT EXISTS "taxExempt" BOOLEAN DEFAULT false;
UPDATE public."Invoices" SET "taxExempt" = false WHERE "taxExempt" IS NULL;
