-- Affiliate catalog: outbound Amazon URL per product (required after backfill).
ALTER TABLE "Products"
ADD COLUMN IF NOT EXISTS "amazonLink" VARCHAR(2048);

UPDATE "Products"
SET "amazonLink" = 'https://www.amazon.com'
WHERE "amazonLink" IS NULL OR TRIM("amazonLink") = '';

ALTER TABLE "Products"
ALTER COLUMN "amazonLink" SET NOT NULL;
