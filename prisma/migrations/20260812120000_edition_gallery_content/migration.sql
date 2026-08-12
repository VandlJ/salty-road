-- Moves the photo gallery from the flat `gallery_photos` Setting row onto the
-- edition that owns it, so a second edition can have its own gallery instead
-- of overwriting Volume 1's. The admin gallery page already warned about this
-- ("once Volume 2 exists, it'll need its own gallery").
--
-- Copies rather than moves: the Setting row is deliberately left behind as an
-- inert backup, since nothing reads it after this release. It carries the only
-- copy of 30 curated photo URLs with their photographer credits, and a failed
-- cast here would otherwise lose them. Safe to delete in a later migration.
UPDATE "Edition"
SET "galleryPhotos" = COALESCE(
  (SELECT s."value"::jsonb FROM "Setting" s WHERE s."key" = 'gallery_photos'),
  '[]'::jsonb
)
WHERE "slug" = 'vol1';
