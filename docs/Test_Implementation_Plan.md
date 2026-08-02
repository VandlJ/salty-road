# Test Implementation Plan — Salty Road

**Datum:** 2. 8. 2026
**Rozsah:** E2E (Playwright), Unit/Integrační testy (Vitest), CI/CD (GitHub Actions)
**Metodika:** analýza repozitáře — inventura testovací infrastruktury, mapování čistých funkcí, identifikace kritických byznysových cest a jejich testovatelnosti

---

## Výchozí stav (zjištěno)

**Testovací infrastruktura: nulová.** Žádný Vitest/Jest, žádný Playwright/Cypress, žádný `.github/` adresář, žádný `*.test.*` ani `*.spec.*` soubor, žádné `data-testid` v celém `src/`. Jediná automatizovaná kontrola je `npm run lint` (ESLint); ani `tsc --noEmit` není ve `scripts` — typová kontrola se dnes spouští jen ručně.

Projekt je přitom už v produkci a zpracovává reálné objednávky. Nejrizikovější kombinace: **nejsložitější logika v celém repu (checkout) nemá jediný test** a zároveň každá její regrese znamená ztracené peníze nebo rozbitý sklad.

### Co hraje pro nás

- **Čisté funkce jsou skutečně čisté.** `variantLabel.ts`, `orderVs.ts`, `formatPrice.ts`, `seo.ts`, `crewAuth.ts`, `qr.ts` (kromě `generateQRCodeBase64`) nemají žádnou DB závislost — otestovatelné bez jakéhokoliv mockování.
- **Checkout formulář má korektní `id` + `htmlFor`** (`src/app/[locale]/shop/checkout/page.tsx:186-336`) — Playwright `getByLabel()` funguje bez přidávání test-idů.
- **`sendEmail` už dnes bezpečně no-opuje**, když chybí `RESEND_API_KEY` (`src/lib/email.ts:30-34`) — testovací běh nikdy neodešle reálný e-mail, stačí proměnnou nenastavit.
- **Zustand store jde testovat bez Reactu** přes `useCartStore.getState()` / `setState()`.

### Co hraje proti nám (blokery, řešit ve Fázi 1)

| Bloker | Dopad | Řešení |
|---|---|---|
| **Sdílená produkční DB** (Prisma Accelerate, žádná dev DB) | E2E test by zapisoval reálné objednávky a odečítal reálný sklad | Samostatná test DB + seed skript (viz F1.4) |
| **Žádné `data-testid`** | Selektory závislé na i18n textu, rozbijí se při změně překladu | Přidat `data-testid` na ~12 kritických prvků (F2.1) |
| **Rate limit 20 checkoutů/h na IP** | Opakovaný běh E2E suity narazí na 429 | Nechat `REDIS_URL` nenastavené → in-memory limiter, resetuje se s procesem |
| **`shopEnabled` je defaultně vypnuté** | `/shop` je noindex a odkaz v navbaru schovaný | Seed skript nastaví `shop_enabled = "true"` |
| **Vercel Blob upload** v `/api/upload` | Test by nahrával reálné soubory | Netestovat E2E; integračně s mockem `@vercel/blob` |

---

## FÁZE 1 — Setup infrastruktury

### [x] F1.1 Nainstalovat Vitest + konfigurace

**Balíčky:** `vitest`, `@vitejs/plugin-react`, `vite-tsconfig-paths`, `jsdom` (jen pro cartStore testy), `@testing-library/react` (volitelně, viz F3.4).

`vite-tsconfig-paths` je nutný — celý projekt používá `@/` alias z `tsconfig.json`, bez něj se importy v testech nerozřeší.

```ts
// vitest.config.ts
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  // Resolves the "@/..." alias from tsconfig.json — without this every
  // import in a test file fails to resolve.
  plugins: [tsconfigPaths()],
  test: {
    // Default to node: most units under test are pure functions with no DOM.
    // Files that need a DOM opt in per-file via a docblock:
    //   /** @vitest-environment jsdom */
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    setupFiles: ["./vitest.setup.ts"],
    coverage: {
      provider: "v8",
      // Only the logic we actually assert on — pages/components are covered
      // by E2E instead, so leaving them in would produce a misleading number.
      include: ["src/lib/**", "src/app/api/**"],
    },
  },
});
```

```ts
// vitest.setup.ts
// Env vars that pure functions read at call time. Set here so unit tests
// never depend on a real .env being present (CI has no .env file).
process.env.BANK_ACCOUNT_IBAN = "CZ0000000000000000000000";
process.env.ENTRY_SESSION_SECRET = "test-secret-not-used-in-production";
process.env.ENTRY_PIN = "1234";
// Deliberately NOT setting RESEND_API_KEY — src/lib/email.ts no-ops without
// it, which is exactly the behaviour we want during tests.
```

### [x] F1.2 Nainstalovat Playwright + konfigurace

**Balíčky:** `@playwright/test`.

```ts
// playwright.config.ts
import { defineConfig, devices } from "@playwright/test";

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  // The cart is a single shared localStorage key ("salty-road-cart") and the
  // test DB has finite stock, so parallel workers would fight over both.
  // Sequential is slower but is the only way these stay deterministic.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["html"]] : [["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // Production build, not `next dev`: dev-mode compile-on-demand makes the
    // first hit to each route slow enough to cause flaky timeouts.
    command: "npm run build && npm run start",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
```

### [x] F1.3 Doplnit npm scripts

**Soubor:** `package.json`

Chybí i `typecheck` — `tsc --noEmit` se dnes spouští jen ručně, což znamená, že typová chyba může projít do main.

```json
{
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

### [x] F1.4 Vytvořit izolovanou testovací databázi + seed skript

**Nový soubor:** `scripts/seedTestDb.mjs`

Toto je **předpoklad pro celou Fázi 2** — bez něj by E2E testy zapisovaly do produkce.

Rozhodnuto: **žádná perzistentní test DB, jen ephemeral Postgres kontejner v CI** (`services: postgres:16` v `.github/workflows/ci.yml`, job `e2e`) — vzniká a zaniká s každým CI během, nic se ručně nezakládá. Žádný `.env.test`, proměnné jdou přímo z `env:` bloku toho jobu.

Seed musí založit deterministickou sadu dat, na kterou se testy odkazují napevno:
- produkt `test-hoodie` (aktivní, prodejný, 2 barvy × 3 velikosti, dostatečný sklad)
- produkt `test-sticker` (`sellable: false`, `giftEligible: true`, sklad 5) — pro test dárku
- produkt `test-soldout` (jedna varianta se `quantity: 0`) — pro test „upozornit až bude skladem"
- kupón `TEST10` (percent, 10), `TESTFIX` (fixed, 100 Kč), `TESTSHIP` (free_shipping), `TESTONCE` (maxUses: 1)
- `Setting`: `shop_enabled = "true"`, `shipping_fee_halire = "9900"`, `sticker_gift_threshold_halire = "150000"`
- admin účet pro admin E2E scénáře

Skript musí být **idempotentní** (nejdřív smazat vše s prefixem `test-`, pak vytvořit) — jinak druhý běh spadne na unique constraint u `slug`/`code`.

### [x] F1.5 Přidat `.gitignore` položky

**Soubor:** `.gitignore` — doplnit `/test-results/`, `/playwright-report/`, `/playwright/.cache/`, `/coverage/`.

---

## FÁZE 2 — E2E kritické cesty (Playwright)

> **Priorita napříč fází:** F2.2 (nákup) > F2.3 (kupóny) > F2.5 (registrace) > F2.4 (dárek) > F2.6 (admin) > F2.7 (kill switch).
> Pokud dojde čas, F2.2 sama o sobě pokrývá ~80 % byznysového rizika.

### [x] F2.1 Přidat `data-testid` na kritické prvky

**Soubory:** `src/app/[locale]/shop/page.tsx`, `src/app/[locale]/shop/[slug]/product-detail-client.tsx`, `src/app/[locale]/shop/cart/page.tsx`, `src/app/[locale]/shop/checkout/page.tsx`, `src/app/[locale]/shop/thank-you/page.tsx`

Bez nich musí selektory viset na českém textu z `messages/cs.json`, takže **jakákoliv úprava překladu rozbije testy** — a suita se stane nedůvěryhodnou přesně v momentě, kdy ji potřebujeme nejvíc.

Dva konkrétní nálezy, které to dělají nutným, ne jen hezkým:

1. **`cartCheckout` je v DOM dvakrát** (`cart/page.tsx:433` disabled `<span>` při problému se skladem, `:440` funkční `<Link>`). `getByText("Pokračovat k pokladně")` matchne oba → strict mode violation nebo, hůř, klik na neaktivní prvek.
2. **Tlačítko přidání do košíku mění text** podle stavu (`addToCart` → `addedToCart`, `product-detail-client.tsx:519`). Text je zároveň selektor i asserce — jedno rozbije druhé.

Minimální sada: `product-card`, `variant-color-option`, `variant-size-option`, `add-to-cart`, `cart-badge`, `cart-item`, `cart-item-remove`, `coupon-input`, `coupon-apply`, `cart-total`, `checkout-submit`, `order-vs`.

### [x] F2.2 E2E: Kompletní nákupní cesta (nejvyšší priorita)

**Nový soubor:** `e2e/purchase-flow.spec.ts`

Nejdražší cesta v aplikaci — pokud se rozbije tahle, e-shop nevydělává.

Ověřuje krok za krokem:
- `/shop` vrátí grid s produkty **už v initial HTML** (regrese na C2 z produkčního auditu — stránka byla dřív klientsky renderovaná; asserce přes `page.goto()` + kontrolu obsahu bez čekání na hydrataci)
- proklik na detail produktu → výběr barvy → výběr velikosti → cena se aktualizuje podle varianty
- „Přidat do košíku" → badge v navbaru ukazuje správný počet
- `/shop/cart` → položka sedí (název, varianta, cena, množství)
- změna množství stepperem → mezisoučet se přepočítá
- „Pokračovat k pokladně" → vyplnění formuláře přes `getByLabel()` (jméno, příjmení, e-mail, telefon, ulice, město, PSČ)
- odeslání → redirect na `/shop/thank-you`
- **na thank-you stránce je variabilní symbol a QR kód** (`thank-you/page.tsx` čte ze `sessionStorage`)
- **cross-check proti DB:** objednávka existuje, `totalAmount` = suma položek + poštovné, sklad varianty klesl přesně o objednané množství

### [x] F2.3 E2E: Kupóny v košíku

**Nový soubor:** `e2e/coupon.spec.ts`

Čtyři scénáře, každý na jiný typ kupónu ze seedu:
- `TEST10` (percent) → sleva = 10 % z mezisoučtu, total se sníží
- `TESTFIX` (fixed) → sleva přesně 100 Kč
- `TESTSHIP` (free_shipping) → **poštovné spadne na 0**, mezisoučet položek zůstane nedotčený, hláška „doprava zdarma"
- neplatný kód → chybová hláška, total beze změny

Plus regrese na dvě věci, které jsou dnes ošetřené v `cartStore.ts:55-64`, ale nikde netestované:
- odebrání poslední položky z košíku → **kupón se zruší** (jinak by naskočil znovu při dalším nákupu)
- kupón `TESTONCE` (`maxUses: 1`) použitý podruhé → checkout vrátí `invalid_coupon`, objednávka nevznikne

### [x] F2.4 E2E: Dárek zdarma nad limit

**Nový soubor:** `e2e/gift.spec.ts`

**Soubory pod testem:** `src/app/[locale]/shop/cart/page.tsx`, `src/app/api/merch/gift-options/route.ts`

- košík **pod** limitem (150 000 haléřů dle seedu) → sekce dárku není vidět, místo ní progress bar „Ještě X Kč do dárku zdarma"
- košík **nad** limitem → objeví se výběr dárku, nabízí `test-sticker`
- výběr dárku → checkout → **`Order.giftLabel` vyplněný**, sklad samolepky klesl o 1
- **negativní scénář (kritický):** vybrat dárek nad limitem → vrátit se do košíku → snížit množství pod limit → dokončit objednávku → **objednávka projde bez dárku, ne s chybou** (logika „bonus nesmí shodit placený nákup", `checkout/route.ts:197-245`)

### [x] F2.5 E2E: Registrace vozu (druhá byznysová cesta)

**Nový soubor:** `e2e/registration.spec.ts`

**Soubory pod testem:** `src/components/registerForm.tsx`, `src/app/api/register/route.ts`

E-shop není jediná kritická cesta — registrace na výstavu je původní účel webu.

- vyplnění formuláře (jméno, e-mail, značka, model, rok) → odeslání → potvrzovací stav
- záznam v DB se statusem `pending`
- `/check` s vráceným ID → zobrazí správný stav registrace
- zavřená registrace (`registration_open = "false"`) → formulář nejde odeslat

*Poznámka: upload fotek přeskočit — jde na Vercel Blob, testovat integračně s mockem (F4.3).*

### [x] F2.6 E2E: Admin — přijetí objednávky a změna stavu

**Nový soubor:** `e2e/admin.spec.ts`

**Soubory pod testem:** `src/app/[locale]/admin/orders/page.tsx`, `src/app/api/admin/login/route.ts`

- přihlášení přes `/admin` (seedovaný admin)
- objednávka z F2.2 je v seznamu, sedí VS, částka i položky
- změna stavu `pending` → `paid` se propíše do DB
- **odhlášení → `/admin/orders` přesměruje na login** (regrese na autorizační bránu)

Playwright `storageState` pro admin session, ať se nepřihlašuje v každém testu znovu.

### [x] F2.7 E2E: Kill switch e-shopu

**Nový soubor:** `e2e/shop-kill-switch.spec.ts`

`shopEnabled = false` je stav, ve kterém e-shop **dnes reálně je** — a nikdo netestuje, že se v něm chová správně:
- odkaz na e-shop zmizí z navbaru
- `/shop` má `robots: noindex`
- `/sitemap.xml` neobsahuje produkty

---

## FÁZE 3 — Unit testy (Vitest)

### [x] F3.1 `src/lib/qr.ts` — sanitizace SPD (bezpečnostní, nejvyšší priorita fáze)

**Nový soubor:** `src/lib/qr.test.ts`

Jediná funkce v repu, kde chybějící test = **reálná finanční zranitelnost**. `sanitizeSpdField()` (`qr.ts:19-21`) existuje proto, aby zákazníkovo jméno nebo název produktu nemohly injektovat druhé pole do platebního řetězce. Bez testu ji může kdokoliv při refaktoru „zjednodušit" a nikdo si toho nevšimne.

```ts
// src/lib/qr.test.ts
import { describe, it, expect } from "vitest";
import { generateSPD } from "@/lib/qr";

describe("generateSPD", () => {
  it("strips SPD field separators from the message", () => {
    // "*" opens a new SPD field — an unsanitised name could inject a second
    // AM (amount) field and change what the customer's bank app pays.
    const spd = generateSPD({ amount: 100, message: "Novak*AM:1.00", vs: "2608020001" });
    expect(spd).not.toContain("*AM:1.00");
    // Exactly one amount field must survive.
    expect(spd.match(/\*AM:/g)).toHaveLength(1);
  });

  it("strips newlines and plus signs", () => {
    const spd = generateSPD({ amount: 50, message: "a\r\nb+c" });
    expect(spd).toContain("MSG:abc");
  });

  it("truncates the message to 60 characters", () => {
    const spd = generateSPD({ amount: 50, message: "x".repeat(100) });
    expect(spd.split("MSG:")[1]).toHaveLength(60);
  });

  it("throws when the bank account is not configured", () => {
    const original = process.env.BANK_ACCOUNT_IBAN;
    delete process.env.BANK_ACCOUNT_IBAN;
    expect(() => generateSPD({ amount: 1, message: "x" })).toThrow();
    process.env.BANK_ACCOUNT_IBAN = original;
  });
});
```

### [x] F3.2 `src/lib/cartStore.ts` — stav košíku

**Nový soubor:** `src/lib/cartStore.test.ts`

Testovat store přímo přes `getState()`, bez Reactu a bez renderu. Nutný `/** @vitest-environment jsdom */` docblock kvůli `zustand/persist` sahajícímu na `localStorage`.

Pokrýt (každý bod odpovídá reálné logice, ne triviálnímu getteru):
- `addItem` novou položku → přidá se do `items`
- `addItem` existující SKU → **sečte množství, ale ořízne na `maxQty`** (`cartStore.ts:46`)
- `addItem` bez `maxQty` → neomezeně (`Infinity` fallback)
- `removeItem` poslední položky → **`couponCode` i `giftSku` se vynulují** (`:58`)
- `updateQty` na prázdný košík → totéž (`:63`)
- `cartTotal` / `cartCount` → správný součet přes víc položek s různým množstvím
- `clear()` → vynuluje všechny tři klíče

```ts
/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach } from "vitest";
import { useCartStore, cartTotal } from "@/lib/cartStore";

const item = {
  sku: "TEST-M", productSlug: "test-hoodie", name: "Test",
  variantLabel: "M", unitPrice: 65000, qty: 1,
};

describe("cartStore", () => {
  beforeEach(() => {
    useCartStore.setState({ items: [], couponCode: null, giftSku: null });
  });

  it("caps a merged quantity at the live stock limit", () => {
    useCartStore.getState().addItem(item);
    // Adding 5 more of a variant that only has 3 in stock must land on 3,
    // not 6 — the customer finds out here instead of at checkout.
    useCartStore.getState().addItem({ ...item, qty: 5 }, 3);
    expect(useCartStore.getState().items[0].qty).toBe(3);
  });

  it("clears the coupon and gift when the cart becomes empty", () => {
    useCartStore.getState().addItem(item);
    useCartStore.getState().setCoupon("TEST10");
    useCartStore.getState().setGift("TEST-STICKER");
    useCartStore.getState().removeItem(item.sku);

    const state = useCartStore.getState();
    expect(state.couponCode).toBeNull();
    expect(state.giftSku).toBeNull();
  });

  it("sums line totals across items", () => {
    expect(cartTotal([item, { ...item, sku: "TEST-L", qty: 2 }])).toBe(195000);
  });
});
```

### [x] F3.3 `src/lib/variantLabel.ts` — řazení a popisky variant

**Nový soubor:** `src/lib/variantLabel.test.ts`

Řazení variant je logika, kterou zákazník vidí na každé stránce produktu a která má **explicitně dokumentované edge case** (`variantLabel.ts:1-5`) — přesně to, co unit test má hlídat:
- `sizeRank` → `null`/`undefined` = `-1`, neznámá velikost = `1000` (řadí se za všechny známé)
- `compareBySize` → `S < M < L < XL < 2XL` dle `SIZE_ORDER`, ne abecedně
- neznámé velikosti mezi sebou → abecedně, nikdy nespadne
- `compareVariantsForDisplay` → primárně `order` (barevná skupina), sekundárně velikost
- `variantLabel` → všechny 4 kombinace: `size+color` → `"M / Černá"`, jen size, jen color, ani jedno → `""`

### [x] F3.4 `src/lib/orderVs.ts` + `formatPrice.ts` — peníze a variabilní symboly

**Nové soubory:** `src/lib/orderVs.test.ts`, `src/lib/formatPrice.test.ts`

`getOrderVs` je **derivovaná, neuložená hodnota** počítaná nezávisle na dvou místech (checkout route i admin objednávky, `orderVs.ts:1-5`). Pokud se rozejdou, platba se nespáruje s objednávkou:
- `getOrderVs(new Date("2026-07-30"), 3)` → `"2607300003"`
- padding: jednociferný měsíc/den → `"2601050001"`
- `orderNumber` nad 4 číslice → neořízne se
- vždy jen číslice (banka jiné znaky odmítne)

`formatPrice` → `145000` haléřů = `"1 450 Kč"` (pozor: `toLocaleString("cs-CZ")` vkládá **úzkou nedělitelnou mezeru**, ne obyčejnou — test to musí porovnávat přesně, jinak bude falešně procházet/padat).

### [x] F3.5 `src/lib/crewAuth.ts` + `seo.ts` — bezpečnostní pomocníky

**Nové soubory:** `src/lib/crewAuth.test.ts`, `src/lib/seo.test.ts`

`crewAuth`:
- `createCrewToken()` → `verifyCrewToken()` projde
- podvržený podpis → neprojde
- expirovaný payload → neprojde
- deformovaný token (bez tečky, prázdný, `undefined`) → `false`, **nikdy výjimka**

`seo.jsonLdScript` — obrana proti XSS z admin panelu (`seo.ts:25-28`):
- popis produktu obsahující `</script>` → v outputu escapovaný jako `<`, nemůže vyskočit z tagu

### [x] F3.6 `src/lib/rateLimit.ts` — in-memory limiter

**Nový soubor:** `src/lib/rateLimit.test.ts`

Testovat pouze in-memory větev (bez `REDIS_URL`) — Redis větev patří do integračních testů a v CI stejně není:
- N požadavků pod limitem → všechny `true`
- N+1 → `false`
- po vypršení okna → znovu `true` (přes `vi.useFakeTimers()`)
- `getClientIp` → z `x-forwarded-for` bere **první** IP ze seznamu, fallback `x-real-ip`, jinak `"unknown"`

---

## FÁZE 4 — Integrační testy API rout

### [x] F4.1 `/api/merch/checkout` — validační vrstva (bez DB)

**Nový soubor:** `src/app/api/merch/checkout/route.test.ts`

Checkout route je **nejsložitější soubor v repu** (~300 řádků, přes 15 větví). Validační kaskáda (`route.ts:50-100`) se dá otestovat bez DB, protože všechny tyto větve vrací dřív, než se sáhne na Prisma:

- chybějící povinné pole → `400 missing_fields`
- `customerName` jako pole/objekt místo stringu → `400 missing_fields` (ne 500 z Prisma — regrese na W5 z auditu)
- neplatný e-mail → `400 invalid_email`
- telefon mimo `PHONE_RE` → `400 invalid_phone`
- pole delší než `MAX_LEN` → `400 field_too_long`
- `paymentMethod` jiný než `bank_transfer` → `400 invalid_payment_method`
- prázdné `items`, přes 20 řádků, `qty: 0`, `qty: 999`, `qty` desetinné → `400 invalid_items`
- `deliveryMethod: "pickup"` **bez adresy** → projde (adresa je povinná jen pro `shipping`)

### [x] F4.2 `/api/merch/checkout` — byznysová logika (s mockem Prisma)

**Nový soubor:** `src/app/api/merch/checkout/business.test.ts`

Mockovat `@/lib/prisma` přes `vi.mock()`, včetně `$transaction` (volá callback s mock `tx` objektem).

Invarianty, na kterých stojí celý e-shop:

- **Cena se nikdy nebere od klienta.** Poslat `items` s podvrženou cenou → výsledný `totalAmount` odpovídá ceně z DB, ne z requestu. *(Nejdůležitější jediná asserce v celé suitě.)*
- **Idempotence** (`route.ts:120-125`): stejný `idempotencyKey` podruhé → vrátí původní objednávku, `merchVariant.updateMany` se nezavolá znovu
- **Atomický odečet skladu**: `updateMany` je volaný s `where: { quantity: { gte: qty } }` — podmínka nesmí z where clause zmizet
- **Nedostatek skladu** → `409 insufficient_stock` a **rollback** (transakce se nepotvrdí)
- **Kupón**: percent → `round(subtotal * value / 100)`; fixed → `min(value, subtotal)` (nikdy záporný total); kategoriové omezení počítá jen odpovídající část košíku
- **`free_shipping` kupón** → `discountAmount` zůstane 0, `shippingFee` = 0, `shippingCouponCode` vyplněný (nezávislý slot vedle `couponCode` — jde kombinovat s procentuálním/fixním kupónem zároveň)
- **Poštovné**: `pickup` → 0; promo „doprava zdarma" → 0; jinak hodnota ze `Setting`
- **Dárek**: pod limitem → tiše zahozen, objednávka projde; vyprodaný dárek → tiše zahozen, **nikdy neshodí objednávku**
- **E-maily jsou odložené** přes `after()` (`route.ts:~280`) — response se vrátí, i když odeslání selže

### [x] F4.3 Ostatní kritické routy

**Nové soubory:** `src/app/api/merch/coupon/validate/route.test.ts`, `src/app/api/upload/route.test.ts`, `src/app/api/admin/settings/route.test.ts`

- **`coupon/validate`**: expirovaný / vyčerpaný / neaktivní kupón → `404 invalid_coupon`; kategoriový kupón na nesedící košík → `400 coupon_not_applicable`; `free_shipping` → vrací `freeShipping: true` a `discountAmount: 0`. **Nesmí inkrementovat `usedCount`** (je to jen náhled) — asserce, že `$executeRaw` nebyl volán.
- **`/api/upload`**: `folder=merch` bez admin cookie → `401`; prázdný `Content-Type` → `415`; uložený `contentType` **nikdy nepochází z klientské hlavičky** (regrese na C1 z auditu). Mockovat `@vercel/blob`.
- **`/api/admin/settings`**: bez admin session → `401`; `stickerGiftThresholdHalire`/`shippingFeeHalire` se ukládají a čtou jako celá čísla v haléřích; záporná hodnota se ořízne na 0.

---

## FÁZE 5 — CI/CD (GitHub Actions)

### [x] F5.1 Vytvořit workflow

**Nový soubor:** `.github/workflows/ci.yml`

Repozitář dnes **nemá `.github/` vůbec** — nic se při pushi nekontroluje.

Dvě oddělené úlohy: rychlá (lint + typecheck + unit, běží vždy) a pomalá (E2E, potřebuje build i databázi). Rychlá musí doběhnout do ~2 minut, aby nezdržovala.

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  quality:
    name: Lint, types, unit tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      # postinstall already runs `prisma generate`, but an explicit call keeps
      # this job working even if that hook is ever removed.
      - run: npx prisma generate
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test

  e2e:
    name: E2E (Playwright)
    runs-on: ubuntu-latest
    # Only worth the runtime once the cheap checks are green.
    needs: quality
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: saltyroad_test
        options: >-
          --health-cmd pg_isready --health-interval 10s
          --health-timeout 5s --health-retries 5
        ports: ["5432:5432"]
    env:
      # Plain Postgres, not Accelerate — the test DB is local to the runner.
      DATABASE_URL: postgresql://postgres:postgres@localhost:5432/saltyroad_test
      DIRECT_DATABASE_URL: postgresql://postgres:postgres@localhost:5432/saltyroad_test
      BANK_ACCOUNT_IBAN: CZ0000000000000000000000
      ENTRY_PIN: "1234"
      ENTRY_SESSION_SECRET: ci-secret-not-used-in-production
      CRON_SECRET: ci-cron-secret
      NEXT_PUBLIC_URL: http://localhost:3000
      # RESEND_API_KEY and BLOB_READ_WRITE_TOKEN are intentionally unset:
      # src/lib/email.ts no-ops without a key, so no real mail is ever sent.
      # REDIS_URL is unset too, so rate limiting stays in-memory and resets
      # with the process instead of carrying 429s between runs.
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npx prisma migrate deploy
      - run: node scripts/seedTestDb.mjs
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v4
        if: ${{ !cancelled() }}
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7
```

### [ ] F5.2 Chránit větev `main`

**Nastavení GitHubu** (ne kód): vyžadovat průchod `quality` a `e2e` před mergem, zakázat přímý push do `main`.

Dnes je to bez omezení — celá tahle session pushovala rovnou do `main`.

### [x] F5.3 Smoke test proti produkci po deployi

**Nový soubor:** `.github/workflows/smoke.yml`

Malá podmnožina E2E (načtení homepage, `/shop` vrací produkty, `/api/shop-status` odpovídá) spouštěná proti `https://www.saltyroad.cz` po Vercel deployi. **Pouze čtecí operace** — žádné vytváření objednávek proti ostré databázi.

---

## Doporučené pořadí implementace

| Pořadí | Fáze | Odhad | Proč právě teď |
|---|---|---|---|
| 1 | F1.1, F1.3 (Vitest + scripts) | 30 min | Odemyká celou Fázi 3 |
| 2 | F3.1 (SPD sanitizace) | 30 min | Bezpečnostní, nejlepší poměr hodnota/čas |
| 3 | F3.2 (cartStore) | 1 h | Nejvíc netestované logiky, kterou zákazník přímo cítí |
| 4 | F3.3–F3.6 (zbytek čistých funkcí) | 2 h | Rychlé, mechanické |
| 5 | F4.1 (validace checkoutu) | 1,5 h | Bez DB, vysoká návratnost |
| 6 | F5.1 `quality` job | 30 min | Od teď hlídá každý PR |
| 7 | F1.4 (test DB + seed) | 2 h | Předpoklad pro E2E |
| 8 | F1.2, F2.1, F2.2 (Playwright + nákup) | 4 h | Hlavní byznysová cesta |
| 9 | F4.2 (byznysová logika checkoutu) | 3 h | Nejsložitější, ale nejcennější |
| 10 | Zbytek F2 + F5.2, F5.3 | dle kapacity | |

**Realisticky:** body 1–6 zaberou zhruba den práce a pokryjí většinu rizika u čisté logiky. E2E (7–8) je další den, ale až po zřízení testovací databáze — bez ní nemá smysl začínat.

---

## Co záměrně netestovat

Aby suita zůstala rychlá a důvěryhodná, tohle vynechat:

- **Vizuální podoba komponent** (`SectionHeading`, `FadeSwap`, animace přes `motion`) — snapshot testy UI se rozbíjejí při každé změně stylu a nic reálného nechrání
- **`src/lib/prisma.ts`** — jen singleton wrapper, testovalo by se tím Prisma, ne náš kód
- **`emailPreview.ts` a `src/emails/*.mjs`** — šablony textu; případná chyba je kosmetická, ne funkční
- **Admin CRUD u produktů a variant** za rámec F2.6 — vysoká údržba, nízké riziko (chybu okamžitě vidí admin sám)
- **`/api/geocode/suggest`** — tenký proxy na Mapy.cz; testovat cizí API nedává smysl, chybějící klíč už dnes degraduje elegantně
