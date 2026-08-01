-- Rename to reflect that gift eligibility no longer implies the product is
-- hidden from normal sale — a product can be sold AND offered as a gift.
ALTER TABLE "MerchProduct" RENAME COLUMN "giftOnly" TO "giftEligible";
