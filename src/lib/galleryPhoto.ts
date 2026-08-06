// Client-safe slice of the gallery module: type + pure helper only, no
// prisma/next-cache imports. event-gallery-section.tsx is a client
// component — importing normalizeInstagramUrl from @/lib/gallery instead
// would drag prisma into the client bundle and crash there.
export interface GalleryPhoto {
  url: string;
  // Photographer/car-owner Instagram, tagged per-photo (usually in a batch —
  // one photographer's whole set at once) from /admin/gallery. Free text as
  // typed by the admin (handle, @handle, or full URL) — normalizeInstagramUrl
  // turns it into a real link wherever it's rendered, so storage doesn't have
  // to guess the format up front.
  instagram: string | null;
}

// Accepts a handle ("foo"), an @handle ("@foo"), or a full URL, and always
// returns a real, clickable instagram.com link (or null for empty input) —
// the admin gallery input doesn't force a particular format.
export function normalizeInstagramUrl(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const handle = trimmed.replace(/^@/, "");
  return `https://www.instagram.com/${handle}`;
}
