import type { useTranslations } from "next-intl";

// Reads a list from messages/*.json that is stored as a real JSON array.
//
// The alternative — `item1`, `item2`, … keys plus a hardcoded `[1,2,3].map()`
// in the component — means adding a bullet requires editing the messages file
// *and* remembering to bump a magic index array, with nothing catching it if
// you forget. next-intl also can't type-check a key built by interpolation,
// so that pattern silently opted every list out of key checking.
//
// t.raw() is untyped by design (it returns whatever the message holds), hence
// the runtime guard: a mistyped key or a non-array value renders nothing
// rather than throwing.
export function rawList<T>(t: ReturnType<typeof useTranslations>, key: string): T[] {
  const raw = t.raw(key);
  return Array.isArray(raw) ? (raw as T[]) : [];
}
