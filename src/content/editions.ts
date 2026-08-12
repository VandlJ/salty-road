// Per-edition content that is deliberately code rather than database rows.
//
// The Edition table holds the structural facts (dates, venue, status, fee) and
// the photo gallery, which has an admin UI and Blob-hosted images. What lives
// here instead is content whose assets or presentation already require a
// commit, so splitting it into the database would mean editing two systems to
// make one change:
//
//   sponsors — logos are static files under public/sponsors, and `scaleClass`
//              compensates for each logo's native aspect ratio inside a fixed
//              -height object-contain box, which can only be tuned by eye
//              against the rendered page.
//   videos   — YouTube ids, plus the same kind of by-eye thumbnail tuning.
//
// Adding an edition means adding an entry here (and a row in Edition) — no
// component changes, which is the whole point.

export type Sponsor = {
  src: string;
  alt: string;
  /** Compensates for the logo's own aspect ratio; tuned per asset. */
  scaleClass?: string;
};

export type EditionVideo = {
  /** YouTube video id. */
  id: string;
  // Counteracts pillarboxing baked into a video's own auto-generated YouTube
  // thumbnail: when the source wasn't shot 16:9, YouTube pads the jpg itself
  // with black bars, and object-cover can't crop those away because the image
  // already fills the container width.
  thumbZoom?: string;
};

export type EditionContent = {
  sponsors: Sponsor[];
  videos: EditionVideo[];
  /** Link to press coverage, shown under the media-partner logo. */
  pressArticleUrl?: string;
};

const vol1: EditionContent = {
  videos: [
    { id: "11di09owZRU", thumbZoom: "scale-[1.4] group-hover:scale-[1.47]" },
    { id: "uKLELTHzO9M" },
  ],
  // No tiering or hierarchy between entries — every sponsor renders at the
  // same size, in this order.
  sponsors: [
    { src: "/sponsors/prachatice.webp", alt: "Prachatice" },
    { src: "/sponsors/hrozen.webp", alt: "Music Club Hrozen", scaleClass: "scale-175" },
    { src: "/sponsors/sts_prachatice.webp", alt: "STS Prachatice" },
    { src: "/sponsors/zephyron.webp", alt: "Zephyron", scaleClass: "scale-130" },
    { src: "/sponsors/breathe.webp", alt: "Breathe", scaleClass: "scale-250" },
    { src: "/sponsors/kuta.webp", alt: "Kuta Servis", scaleClass: "scale-115" },
    { src: "/sponsors/dovoz.webp", alt: "Dovoz aut", scaleClass: "scale-150" },
    { src: "/sponsors/dilna.webp", alt: "Dilna Detailing", scaleClass: "scale-225" },
    { src: "/sponsors/babeta.webp", alt: "Babeta Elektro", scaleClass: "scale-140" },
    { src: "/sponsors/bestlak.webp", alt: "Bestlak", scaleClass: "scale-180" },
    { src: "/sponsors/mx777.webp", alt: "MX 777", scaleClass: "scale-130" },
    { src: "/sponsors/siska_hospoda.webp", alt: "Podolská hospůdka", scaleClass: "scale-160" },
    { src: "/sponsors/siska_taxi.webp", alt: "Antonín Šiška Taxi", scaleClass: "scale-140" },
    { src: "/sponsors/lacoffee.webp", alt: "LA Coffee", scaleClass: "scale-150" },
    { src: "/sponsors/lavape.webp", alt: "LA Vape", scaleClass: "scale-200" },
    { src: "/sponsors/rdetailing.webp", alt: "R Detailing", scaleClass: "scale-180" },
    { src: "/sponsors/ts_instal.webp", alt: "TS INSTAL", scaleClass: "scale-180" },
    { src: "/sponsors/redline.webp", alt: "Redline Detailing", scaleClass: "scale-180" },
    { src: "/sponsors/autolakovna.webp", alt: "Autolakovna Lažiště", scaleClass: "scale-230" },
    { src: "/sponsors/ze_statku.webp", alt: "Reklamní studio Ze Statku", scaleClass: "scale-180" },
    { src: "/sponsors/bart.webp", alt: "Železářství Bártovi", scaleClass: "scale-180" },
    { src: "/sponsors/logo-mbrent.webp", alt: "MB-Rent-PT" },
    { src: "/sponsors/logo-folie.webp", alt: "FoliePT", scaleClass: "scale-220" },
    { src: "/sponsors/logo-tempo.webp", alt: "Tempo Detailing", scaleClass: "scale-90" },
  ],
  pressArticleUrl:
    "https://prachaticky.denik.cz/zpravy-region/vytunene-kary-na-salty-road-meet-prilakaly-do-centra-prachatic-davy-fanousku/",
};

const EDITION_CONTENT: Record<string, EditionContent> = {
  vol1,
};

const EMPTY: EditionContent = { sponsors: [], videos: [] };

/**
 * Content for one edition. Returns empty lists for an edition that has no
 * entry yet — a brand-new edition has no sponsors or aftermovie on day one,
 * and the sections that render them hide themselves when empty.
 */
export function getEditionContent(slug: string): EditionContent {
  return EDITION_CONTENT[slug] ?? EMPTY;
}
