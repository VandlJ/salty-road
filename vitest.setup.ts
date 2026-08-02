// Matches production (Vercel runs UTC) — getOrderVs() reads local-timezone
// date parts from a UTC-parsed Date, so an unpinned TZ would make that test
// pass or fail depending on which timezone happens to run it.
process.env.TZ = "UTC";

// Env vars that pure functions read at call time. Set here so unit tests
// never depend on a real .env being present (CI has no .env file).
process.env.BANK_ACCOUNT_IBAN = "CZ0000000000000000000000";
process.env.ENTRY_SESSION_SECRET = "test-secret-not-used-in-production";
process.env.ENTRY_PIN = "1234";
// Deliberately NOT setting RESEND_API_KEY — src/lib/email.ts no-ops without
// it, which is exactly the behaviour we want during tests.

// jsdom (as configured here) doesn't implement localStorage, but
// zustand/persist (src/lib/cartStore.ts) reaches for it unconditionally —
// a minimal in-memory Storage polyfill is enough for persist to work.
if (typeof globalThis.localStorage === "undefined") {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
    clear: () => store.clear(),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  } as Storage;
}
