import { hasLocale, type Locale } from "next-intl";
import { routing } from "./routing";

// Narrows a `[locale]` route segment to the Locale union.
//
// Route params can't be typed as Locale directly: Next generates its own
// PageProps/LayoutProps where params is `{ locale: string }`, and a narrower
// annotation fails the generated-type constraint at build time. So the
// narrowing happens here, at the point of use.
//
// The fallback is unreachable in practice — the root layout calls
// hasLocale()/notFound() before any child renders — so this formalises a
// guarantee that already holds rather than adding a new one.
export function toLocale(value: string): Locale {
  return hasLocale(routing.locales, value) ? value : routing.defaultLocale;
}
