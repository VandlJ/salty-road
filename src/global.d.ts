import type messages from "../messages/cs.json";
import type { routing } from "@/i18n/routing";

// Makes next-intl check message keys at compile time: t("typo") is now a
// tsc error instead of a runtime one.
//
// This is what lets unused translation keys be deleted safely. Before it,
// removing a key passed typecheck and only blew up in the browser, which is
// why messages/*.json carried "_comment": "DO NOT DELETE" guards — a comment
// was the only thing protecting keys that no live page referenced.
//
// cs.json is the reference locale (defaultLocale in src/i18n/routing.ts).
// en.json is kept structurally identical by hand; a key in one but not the
// other is exactly the drift this is meant to surface.
declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: typeof messages;
  }
}
