-- Introduces Edition and scopes Registration to it.
--
-- Hand-written as expand -> backfill -> contract, because the generated
-- version adds `Registration.editionId` as NOT NULL with no default, which
-- cannot run against a table that already holds Volume 1's registrations
-- (108 rows at the time of writing). Same for the new `updatedAt` columns.
--
-- Deliberately NOT moved here: the `gallery_photos` Setting row. Copying it
-- into Edition.galleryPhotos now would leave two live copies that drift the
-- moment an admin edits the gallery, since lib/gallery.ts still reads the
-- Setting. Gallery, videos, sponsors and recap stats all move across in one
-- step with the components that read them.

-- CreateTable
CREATE TABLE "Edition" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "venueName" TEXT NOT NULL,
    "venueLocality" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'upcoming',
    "registrationOpen" BOOLEAN NOT NULL DEFAULT false,
    "registrationFee" INTEGER NOT NULL DEFAULT 29900,
    "galleryPhotos" JSONB NOT NULL DEFAULT '[]',
    "videos" JSONB NOT NULL DEFAULT '[]',
    "sponsors" JSONB NOT NULL DEFAULT '[]',
    "recapStats" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Edition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Edition_slug_key" ON "Edition"("slug");
CREATE UNIQUE INDEX "Edition_number_key" ON "Edition"("number");
CREATE INDEX "Edition_status_idx" ON "Edition"("status");

-- Seed Volume 1. Fixed id rather than a generated one so the backfill below
-- and any later reference can rely on it. Values mirror what the archived
-- homepage already showed (ArchivePage.hero in messages/*.json) and the
-- registration fee hard-coded in api/admin/registrations/route.ts.
INSERT INTO "Edition" (
    "id", "slug", "number", "name",
    "startDate", "endDate",
    "venueName", "venueLocality",
    "status", "registrationOpen", "registrationFee"
) VALUES (
    'edition_vol1', 'vol1', 1, 'Volume 1',
    '2026-07-25T00:00:00.000Z', '2026-07-25T23:59:59.000Z',
    'Velké náměstí', 'Prachatice',
    'archived', false, 29900
);

-- Expand: nullable first so existing rows survive the add.
ALTER TABLE "Registration" ADD COLUMN "editionId" TEXT;
ALTER TABLE "Registration" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Backfill: every registration that exists today is a Volume 1 registration.
UPDATE "Registration" SET "editionId" = 'edition_vol1' WHERE "editionId" IS NULL;

-- Contract: now that every row has a value, require it.
ALTER TABLE "Registration" ALTER COLUMN "editionId" SET NOT NULL;

-- AlterTable — same expand pattern, defaulting existing rows to "now".
ALTER TABLE "MerchProduct" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Order" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Swap the registration index over to the edition-scoped shape: every query
-- that filtered on status now filters on edition first.
DROP INDEX "Registration_status_order_idx";
CREATE INDEX "Registration_editionId_status_order_idx" ON "Registration"("editionId", "status", "order");
CREATE INDEX "Registration_editionId_status_arrived_idx" ON "Registration"("editionId", "status", "arrived");

-- AddForeignKey. RESTRICT, not CASCADE: deleting an edition must not silently
-- take its registrations with it.
ALTER TABLE "Registration" ADD CONSTRAINT "Registration_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "Edition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
