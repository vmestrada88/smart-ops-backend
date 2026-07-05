-- Inventory products no longer carry shop affiliate URLs (shop uses AmazonAffiliateListings).
ALTER TABLE "Products" DROP COLUMN IF EXISTS "amazonLink";
