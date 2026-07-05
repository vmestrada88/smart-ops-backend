-- Public Amazon Associates storefront (separate from internal Product inventory).
CREATE TABLE IF NOT EXISTS "AmazonAffiliateListings" (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description VARCHAR(2000),
  category VARCHAR(255),
  "amazonAffiliateUrl" VARCHAR(2048) NOT NULL,
  "imageUrls" VARCHAR(2048)[],
  "isPublished" BOOLEAN NOT NULL DEFAULT true,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "AmazonAffiliateListings_published_order_idx"
  ON "AmazonAffiliateListings" ("isPublished", "displayOrder", id);
