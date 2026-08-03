// Shared SEO helpers: canonical/hreflang URLs and the site's fixed
// Organization identity, reused across every layout's generateMetadata and
// the JSON-LD blocks.
export const SITE_URL = "https://www.saltyroad.cz";
export const LOCALES = ["cs", "en"] as const;
export type SupportedLocale = (typeof LOCALES)[number];

// `path` is the locale-less segment, e.g. "" for the homepage, "/check",
// or "/shop/hoodie-classic".
export function buildAlternates(path: string) {
  const languages: Record<string, string> = {};
  for (const locale of LOCALES) {
    languages[locale] = `${SITE_URL}/${locale}${path}`;
  }
  // No dedicated international-audience page, so x-default points at the
  // primary market's (cs) version rather than a separate neutral page.
  languages["x-default"] = `${SITE_URL}/cs${path}`;
  return languages;
}

export function canonicalUrl(locale: string, path: string): string {
  return `${SITE_URL}/${locale}${path}`;
}

// JSON.stringify doesn't escape "</", so a value containing "</script>"
// (e.g. an admin-entered product description) could break out of the
// <script type="application/ld+json"> tag early and inject arbitrary HTML.
// Escaping "<" as < neutralizes that without changing the JSON value.
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

export const ORGANIZATION_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Salty Road Meet",
  url: SITE_URL,
  logo: `${SITE_URL}/logo_saltyroad-cropped.svg`,
  sameAs: ["https://www.instagram.com/salty_road_meet/"],
  email: "info@saltyroad.cz",
};

// A WebSite entry with an explicit `name` is one of the signals Google
// documents for choosing the bold "sitename" shown in search results
// (https://developers.google.com/search/docs/appearance/site-names) —
// without it Google falls back to displaying the bare domain, which is
// what was happening before this was added.
export const WEBSITE_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Salty Road Meet",
  url: SITE_URL,
};
