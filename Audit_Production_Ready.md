# Audit Production Readiness — Salty Road

**Datum:** 1. 8. 2026
**Rozsah:** e-commerce flow, SEO/OpenGraph, performance & Next.js best practices, security & state management
**Metodika:** statická analýza repozitáře, kontrola build outputu (`next build`), ověření render módů, kontrola všech API rout a jejich autorizačních bran

---

## Shrnutí

Projekt je celkově solidně postavený — atomické operace se skladem a kupóny jsou race-safe, admin API má konzistentní autorizační brány, `.env` neuniká do klienta, košík je persistovaný. **Ale k ostrému spuštění e-shopu má tři skutečné blokery** (nechráněný upload endpoint, plně klientsky renderovaný katalog, chybějící bezpečnostní hlavičky) a několik věcí, které pod reálným provozem způsobí problémy (rate limit blokující rodiny za jednou IP, blokující odesílání e-mailů v checkoutu, chybějící idempotence objednávky).

| Kategorie | Počet |
|---|---|
| CRITICAL | 6 |
| WARNING | 14 |
| NICE TO HAVE | 11 |

---

## CRITICAL — blokuje spuštění

### [x] C1. `/api/upload` nemá žádnou autentizaci — kdokoliv může nahrávat soubory na váš Blob storage

**Soubor:** `src/app/api/upload/route.ts`

Endpoint je zcela veřejný. Limit je 15 MB/soubor a 30 uploadů/hodinu **na IP** — tedy 450 MB/h z jedné IP, neomezeně napříč IP adresami. Navíc:

- Kontrola typu se dá obejít: `if (file.type && !ALLOWED_TYPES.has(file.type) && !isHeicName)` — když útočník pošle soubor **s prázdným `Content-Type`**, podmínka se přeskočí úplně a nahraje se cokoliv.
- `contentType` uložený do Blobu pochází z `file.type` (řízeno útočníkem) → dá se hostovat `text/html` na veřejné URL.
- Cron cleanup (`/api/cron/cleanup`) maže **jen složku `registrations/`** — cokoliv nahrané do `merch/` (nebo do fallback složky) tam zůstane navždy.

Dopad: neomezené náklady za storage, hostování cizího obsahu na vaší infrastruktuře, potenciální phishing.

**Oprava:** rozdělit oprávnění — `merch` jen pro admina, `registrations` nechat veřejné, ale s tvrdší validací obsahu.

```ts
// src/app/api/upload/route.ts
import { getAdminFromReq } from "@/lib/adminAuth";

// ... inside POST, after resolving `folder`:

// The "merch" folder is only ever written from the admin panel — gate it,
// otherwise anyone can push arbitrary files into the product gallery bucket.
if (folder === "merch") {
  const admin = await getAdminFromReq();
  if (!admin) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
}

// Reject an empty/absent Content-Type instead of skipping validation:
// an attacker controls this header, so "unset" must not mean "allowed".
const isHeicName = /\.(heic|heif)$/i.test(file.name);
if (!isHeicName && (!file.type || !ALLOWED_TYPES.has(file.type))) {
  return NextResponse.json({ error: "Unsupported file type" }, { status: 415 });
}
```

Navíc **nikdy neukládat klientem dodaný `contentType`** — odvodit ho z reálného výsledku zpracování:

```ts
// Derive the stored content type from what we actually produced, never
// from the client-supplied header.
const safeContentType = isHeic ? "image/jpeg" : (ALLOWED_TYPES.has(file.type) ? file.type : "image/jpeg");
const blob = await put(remotePath, buffer, {
  access: "public",
  token: process.env.BLOB_READ_WRITE_TOKEN,
  contentType: safeContentType,
});
```

---

### [x] C2. Katalog produktů se renderuje výhradně na klientovi — špatné LCP a obsah není v HTML

**Soubory:** `src/app/[locale]/shop/page.tsx`, `src/app/[locale]/shop/[slug]/page.tsx`

Obě stránky jsou `"use client"` a data načítají přes `useEffect` + `fetch('/api/merch/products...')`. Důsledky:

1. **LCP je špatné.** Sekvence je: prázdné HTML → hydratace JS → `fetch` → teprve pak se začne stahovat produktová fotka. Obrázek (LCP element) startuje o dva round-tripy později, než by musel.
2. **Obsah není v initial HTML.** Metadata a JSON-LD z `layout.tsx` server-rendered jsou (dobře), ale samotný název/cena/popis produktu v HTML nejsou. Google JS renderuje, ale s odkladem a méně spolehlivě; ostatní crawlery (Seznam, náhledové boty sociálních sítí) často ne.
3. **Data se načítají dvakrát.** `shop/[slug]/layout.tsx` už si produkt vytáhne přes Prisma kvůli metadatům — a klient ho vzápětí načte znovu přes API. Zbytečný dotaz na DB u každého zobrazení.

**Oprava:** převést obě stránky na Server Components, které si data načtou přímo přes Prisma (interaktivní části — výběr varianty, přidání do košíku, galerie — vyseknout do malé klientské komponenty a předat jí produkt propem).

```tsx
// src/app/[locale]/shop/page.tsx — Server Component, no "use client"
import prisma from "@/lib/prisma";
import { compareVariantsForDisplay } from "@/lib/variantLabel";
import ShopGrid from "./shop-grid"; // the small "use client" part, if any

export default async function ShopPage() {
  const products = await prisma.merchProduct.findMany({
    where: { active: true },
    orderBy: { order: "asc" },
    include: { variants: { where: { active: true } } },
    cacheStrategy: { ttl: 30 },
  });
  for (const p of products) p.variants.sort(compareVariantsForDisplay);
  const visible = products.filter((p) => p.variants.length > 0);

  // Product markup is now in the initial HTML — the LCP image starts
  // downloading from the first response instead of after hydration+fetch.
  return <ShopGrid products={visible} />;
}
```

U detailu produktu navíc znovupoužít existující `cache()`-ovaný `getProduct` z `layout.tsx`, aby se DB dotaz nezdvojoval.

---

### [x] C3. Chybí bezpečnostní HTTP hlavičky

**Soubor:** `next.config.ts`

Aplikace neposílá žádné bezpečnostní hlavičky — žádné `Content-Security-Policy`, `X-Frame-Options`, `Referrer-Policy`, `X-Content-Type-Options`, `Strict-Transport-Security`. Pro web, který zpracovává objednávky a má admin rozhraní, je to k ostrému provozu nedostatečné (clickjacking na admin panel, žádná obrana proti injektáži skriptů).

**Oprava:**

```ts
// next.config.ts
const nextConfig: NextConfig = {
  // ... existing images config ...
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};
```

CSP zavést zvlášť a postupně (nejdřív `Content-Security-Policy-Report-Only`), protože Next.js inline skripty vyžadují nonce.

---

### [x] C4. Objednávka nemá idempotenci — retry sítě vytvoří duplicitní objednávku a dvakrát odečte sklad

**Soubory:** `src/app/api/merch/checkout/route.ts`, `src/app/[locale]/shop/checkout/page.tsx`

Tlačítko se sice na klientovi zablokuje (`disabled={submitting}`), ale to neřeší: retry na úrovni sítě, dvojklik před flushnutím Reactu, nebo opakované odeslání z jiné záložky. Server nemá žádnou ochranu — každý POST vytvoří novou objednávku, odečte sklad a spotřebuje použití kupónu.

**Oprava:** klient vygeneruje idempotenční klíč jednou za pokus o objednávku a server na něj naváže unikátní index.

```prisma
// prisma/schema.prisma — Order model
idempotencyKey String? @unique
```

```ts
// src/app/api/merch/checkout/route.ts, inside the transaction
// Same key replayed (network retry, double submit) returns the original
// order instead of creating a second one and decrementing stock twice.
if (idempotencyKey) {
  const existing = await tx.order.findUnique({ where: { idempotencyKey } });
  if (existing) return existing;
}
```

Na klientovi klíč generovat v `useState(() => crypto.randomUUID())` a resetovat až po úspěchu.

---

### [x] C5. Rate limit 5 objednávek/hodinu na IP zablokuje reálné zákazníky

**Soubor:** `src/app/api/merch/checkout/route.ts:23`

```ts
rateLimit(`merch-checkout:${getClientIp(req)}`, 5, 60 * 60 * 1000)
```

Na akci typu autovýstava bude spousta návštěvníků za sdílenou mobilní NAT IP nebo na jedné firemní/hotelové wifi. Šestý zákazník za hodinu ze stejné IP dostane 429 a objednávku nedokončí. Stejný problém má `/api/register` (5/h) a `/api/merch/stock-request` (5/h).

Navíc: bez `UPSTASH_REDIS_REST_URL` běží limit **jen v paměti jedné serverless instance** — takže na Vercelu je stejně jen orientační, což je ještě horší kombinace (nespolehlivý, ale dost přísný na to, aby blokoval).

**Oprava:** zvednout limit na rozumnou hodnotu a nasadit Upstash (jinak limit v produkci de facto nefunguje).

```ts
// 5/hour blocks whole households and offices behind a single NAT IP —
// 20/hour still stops scripted abuse without hitting real customers.
rateLimit(`merch-checkout:${getClientIp(req)}`, 20, 60 * 60 * 1000)
```

---

### [x] C6. Odesílání e-mailů blokuje odpověď checkoutu (a komentář tvrdí opak)

**Soubor:** `src/app/api/merch/checkout/route.ts:194-246`

Komentář říká *"best-effort, doesn't block the response"*, ale kód volá `await sendMerchOrderConfirmationEmail(...)` a `await sendEmail(...)` **před** `return NextResponse.json(...)`. Zákazník tedy čeká na generování QR kódu + dvě volání Resend API. Když je Resend pomalý nebo nedostupný (timeout), zákazník kouká na spinner desítky sekund u operace, která už dávno v DB proběhla.

**Oprava:** e-maily poslat mimo kritickou cestu (`after()` z `next/server`), aby odpověď odešla hned.

```ts
import { after } from "next/server";

// Order is already committed — the customer must not wait on Resend.
// after() runs this once the response has been flushed.
after(async () => {
  try {
    await sendMerchOrderConfirmationEmail(/* ... */);
    if (orderEmail) await sendEmail(/* ... */);
  } catch (err) {
    console.error("Error sending merch order emails:", err);
  }
});
```

Pozor: QR kód se posílá i v odpovědi klientovi, takže `generateQRCodeBase64` musí zůstat před `return` — přesunout jen odeslání e-mailů.

---

## WARNING — mělo by se opravit před spuštěním

### [x] W1. Žádná stránka není staticky generovaná — vše je SSR na každý request

**Ověřeno build outputem:** všechny routy jsou označené `ƒ (Dynamic) server-rendered on demand`, staticky jsou jen `/robots.txt`, `/sitemap.xml`, `/icon.svg`.

Homepage, `/privacy`, `/shop/terms` a `/check` jsou z 95 % statický obsah, ale renderují se znovu při každém zobrazení. Při náporu na den akce to zbytečně zatíží funkce i databázi.

**Oprava:** přidat `generateStaticParams` do `src/app/[locale]/layout.tsx` a u čistě statických stránek nastavit revalidaci:

```tsx
// src/app/[locale]/layout.tsx
import { routing } from "@/i18n/routing";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
```

```tsx
// src/app/[locale]/shop/terms/page.tsx — fully static legal text
export const revalidate = false;
```

---

### [x] W2. `/shop/terms` nemá vlastní metadata — chybí title i canonical

**Soubor:** `src/app/[locale]/shop/terms/page.tsx`

Stránka je `"use client"` a nemá `layout.tsx`, takže dědí generický title z `/shop`. Zároveň není v `sitemap.ts`. Pro stránku s obchodními podmínkami (kterou zákazník právně odsouhlasuje) je to nedostatečné.

**Oprava:** vytvořit `src/app/[locale]/shop/terms/layout.tsx` s `generateMetadata` (title, canonical, `buildAlternates("/shop/terms")`) a doplnit route do `src/app/sitemap.ts`.

---

### [x] W3. OG obrázek produktu je portrétová produktová fotka — na Facebooku/WhatsAppu se ošklivě ořízne

**Soubor:** `src/app/[locale]/shop/[slug]/layout.tsx:71-82`

Do `openGraph.images` jde přímo produktová fotka z Blobu. Ty jsou ale v poměru 4:5 (portrét, viz `aspect-[4/5]` v gridu), zatímco OG očekává 1200×630 (landscape 1.91:1). Facebook to ořízne přes střed — u fotky člověka v mikině to typicky ustřihne hlavu i potisk.

Navíc chybí `width`/`height`, takže scraper musí obrázek stáhnout a změřit sám, což zpomaluje první náhled.

**Oprava (minimum):** doplnit rozměry a nechat platformu vědět, co dostává. **Oprava (správně):** generovat OG obrázek dynamicky přes `next/og` — viz N1.

---

### [x] W4. Neexistuje dynamické generování OG obrázků (`next/og`) s cenou

Zadání explicitně požadovalo, aby při sdílení odkazu na mikinu byl vidět **náhled i cena**. Aktuálně se sdílí jen holá fotka bez ceny a bez brandingu.

**Oprava:** `src/app/[locale]/shop/[slug]/opengraph-image.tsx` — viz konkrétní kód v sekci NICE TO HAVE (N1), technicky to není blocker, ale marketingově je to přesně to, co bylo zadané.

---

### [x] W5. Checkout API nevaliduje typy vstupů — neřetězcové hodnoty projdou do Prisma a shodí 500

**Soubor:** `src/app/api/merch/checkout/route.ts:44-64`

`customerName` a `address` se kontrolují jen na "truthy" (`!customerName`). Délková kontrola je uvnitř `if (typeof value === "string")`, takže když klient pošle `customerName: ["a", "b"]` nebo `{}`, kontrola délky se **přeskočí** a hodnota doletí až do Prisma, která vyhodí výjimku → uživatel dostane `server_error` 500 místo srozumitelného 400.

**Oprava:**

```ts
// Type-check before anything else — a non-string here otherwise skips the
// MAX_LEN guard entirely and surfaces as an opaque 500 from Prisma.
for (const field of ["customerName", "customerEmail", "customerPhone"] as const) {
  if (typeof body[field] !== "string") {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
}
if (deliveryMethod === "shipping" && typeof address !== "string") {
  return NextResponse.json({ error: "missing_fields" }, { status: 400 });
}
```

---

### [x] W6. `/api/geocode/suggest` je nechráněný proxy na váš placený Mapy.cz klíč

**Soubor:** `src/app/api/geocode/suggest/route.ts`

Endpoint nemá rate limit ani žádnou kontrolu původu. Kdokoliv může skriptem vyčerpat vaši kvótu Mapy.cz (a tím shodit našeptávač adres v checkoutu).

**Oprava:** přidat rate limit stejným vzorem jako ostatní veřejné endpointy.

```ts
import { rateLimit, getClientIp } from "@/lib/rateLimit";

// Proxies a metered third-party API key — without a limit anyone can
// exhaust the Mapy.cz quota and break checkout address autocomplete.
if (!(await rateLimit(`geocode:${getClientIp(req)}`, 60, 60 * 60 * 1000))) {
  return NextResponse.json({ items: [] });
}
```

---

### [x] W7. Admin login umožňuje enumeraci uživatelských jmen přes časový kanál

**Soubor:** `src/app/api/admin/login/route.ts:19-22`

Neexistující uživatel → okamžitá 401. Existující uživatel → `bcrypt.compare` (~100 ms) → 401. Rozdíl je měřitelný, útočník tak zjistí platná admin jména.

**Oprava:** provést dummy bcrypt porovnání i když uživatel neexistuje.

```ts
const admin = await prisma.admin.findUnique({ where: { username } });
// Always spend the same ~100ms in bcrypt, so a missing user and a wrong
// password are indistinguishable from response timing.
const hash = admin?.password ?? "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidin";
const ok = await bcrypt.compare(password, hash);
if (!admin || !ok) {
  return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
}
```

---

### [x] W8. Cron cleanup nikdy nemaže osiřelé soubory z `merch/`

**Soubor:** `src/app/api/cron/cleanup/route.ts:31`

```ts
const registrationBlobs = blobs.filter(b => b.pathname.startsWith('registrations/'));
```

Fotky produktů smazaných v adminu zůstávají v Blobu navždy. Zároveň `list({ limit: 1000 })` bez stránkování znamená, že jakmile bude blobů víc než 1000, cleanup přestane vidět ty starší.

**Oprava:** zpracovat i `merch/` (proti `MerchProduct.photos` + `MerchVariant.images` + `sizeChartImage`) a projít všechny stránky přes `cursor`.

---

### [x] W9. Chybí `notFound()` validace locale segmentu

**Soubor:** `src/app/[locale]/layout.tsx`

Layout nikde neověřuje, že `locale` je jeden z podporovaných. `src/i18n/request.ts` sice tiše spadne zpět na `cs`, ale doporučený postup next-intl v4 je vrátit 404 — jinak hrozí duplicitní obsah pod nesmyslnými URL.

**Oprava:**

```tsx
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";

const { locale } = await params;
if (!hasLocale(routing.locales, locale)) notFound();
```

---

### [x] W10. Košík nekontroluje sklad při přidání položky

**Soubor:** `src/lib/cartStore.ts:36-47`

`addItem` u existující položky slepě sečte `qty` bez ohledu na dostupný sklad. Uživatel může 5× kliknout "Přidat do košíku" u varianty, kde je 1 kus, a problém se objeví až na stránce košíku (nebo v checkoutu jako 409). Zbytečně pozdní zpětná vazba.

**Oprava:** předat `maxQty` do `addItem` a ořezat:

```ts
addItem: (item, maxQty) =>
  set((state) => {
    const existing = state.items.find((i) => i.sku === item.sku);
    if (existing) {
      // Cap at live stock so the user finds out here, not at checkout.
      const nextQty = Math.min(existing.qty + item.qty, maxQty ?? Infinity);
      return { items: state.items.map((i) => (i.sku === item.sku ? { ...i, qty: nextQty } : i)) };
    }
    return { items: [...state.items, item] };
  }),
```

---

### [x] W11. Kupón zůstane v košíku i po jeho vyprázdnění

**Soubor:** `src/lib/cartStore.ts:48-49`

`removeItem` odebere poslední položku, ale `couponCode` v `localStorage` zůstane. Uživatel si příště přidá jiné zboží a nečekaně mu naskočí sleva ze starého kódu (ověřená znovu serverem, takže ne bezpečnostní díra — ale matoucí a špatně otestovatelné).

**Oprava:** v `removeItem` a `updateQty` vynulovat kupón, pokud košík zůstane prázdný.

---

### [x] W12. Chybí `QuantityStepper` limit, když sklad ještě není načtený

**Soubor:** `src/app/[locale]/shop/cart/page.tsx:219`

`max={available}` — dokud `/api/merch/stock` nedoběhne, `available` je `undefined` a stepper nemá strop. Uživatel může během té doby nastavit libovolné množství.

**Oprava:** do doby načtení stropu držet aktuální hodnotu (`max={available ?? item.qty}`).

---

### [x] W13. Nepřesné komentáře — tvrdí neexistující fakta o architektuře

**Soubory:** `src/app/global-not-found.tsx:1-3`, `src/app/api/merch/checkout/route.ts:194`

- `global-not-found.tsx` tvrdí *"no middleware here to rewrite/redirect a bare or unknown path into a locale segment"* — **middleware existuje** (`src/proxy.ts`, next-intl). Komentář vede příštího čtenáře k chybnému závěru o tom, které 404 boundary se kdy spouští.
- `checkout/route.ts` tvrdí *"doesn't block the response"* u kódu, který ji blokuje (viz C6).

**Oprava:** komentáře opravit tak, aby popisovaly skutečný stav.

---

### [x] W14. Bez `UPSTASH_REDIS_REST_URL` rate limiting v produkci prakticky nefunguje

**Soubor:** `src/lib/rateLimit.ts:32-35`

Fallback v paměti je vázaný na jednu warm serverless instanci. Na Vercelu se požadavky rozprostřou přes mnoho instancí, takže reálný limit je násobek nastavené hodnoty a je nepředvídatelný. Kód to sám v komentáři přiznává, ale `.env.example` to označuje jako *"Optional"*.

**Oprava:** pro produkci Upstash označit jako povinný a přidat startup warning, když chybí a `NODE_ENV === "production"`.

---

## NICE TO HAVE — optimalizace

### [x] N1. Dynamický OG obrázek s cenou a brandingem přes `next/og`

Řeší W3 i W4 najednou — vygeneruje se korektní 1200×630 náhled s fotkou, názvem a cenou.

```tsx
// src/app/[locale]/shop/[slug]/opengraph-image.tsx
import { ImageResponse } from "next/og";
import prisma from "@/lib/prisma";
import { formatPrice } from "@/lib/formatPrice";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: { slug: string } }) {
  const product = await prisma.merchProduct.findUnique({
    where: { slug: params.slug },
    select: { name: true, photos: true, variants: { select: { price: true } } },
  });
  if (!product) return new ImageResponse(<div />, size);

  const minPrice = Math.min(...product.variants.map((v) => v.price));

  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: "#0a0a0a" }}>
        {product.photos[0] && (
          <img src={product.photos[0]} width={630} height={630} style={{ objectFit: "cover" }} />
        )}
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: 60, color: "#fff" }}>
          <div style={{ fontSize: 56, fontWeight: 800, textTransform: "uppercase" }}>{product.name}</div>
          <div style={{ width: 64, height: 4, background: "#dc2626", margin: "24px 0" }} />
          <div style={{ fontSize: 48, fontWeight: 700 }}>{formatPrice(minPrice)}</div>
        </div>
      </div>
    ),
    size
  );
}
```

---

### [ ] N2. JSON-LD Product postrádá `brand`, `itemCondition` a `priceValidUntil`

**Soubor:** `src/app/[locale]/shop/[slug]/layout.tsx:106-122`

Google Merchant / Rich Results tato pole doporučuje; bez nich se produkt nemusí zobrazit v rozšířených výsledcích vyhledávání.

---

### [ ] N3. `sitemap.ts` hlásí `lastModified: new Date()` u všeho

**Soubor:** `src/app/sitemap.ts:54`

Každý crawl vidí "změněno právě teď" u všech URL, čímž signál ztrácí smysl. Použít reálné `updatedAt` z DB (u produktů) a fixní datum buildu u statických stránek.

---

### [ ] N4. `priority` na produktové fotce se mění za běhu

**Soubor:** `src/app/[locale]/shop/[slug]/page.tsx:328`

`priority={photoIndex === 0}` — `photoIndex` je state, takže při swipu se `priority` přepíná. Next.js `priority` je určený pro statické rozhodnutí při prvním renderu; dynamické přepínání generuje zbytečné `<link rel=preload>`. Nastavit natvrdo jen pro první render.

---

### [ ] N5. Chybí `error.tsx` boundary

Aplikace nemá žádnou `error.tsx`. Neošetřená výjimka v Server Component skončí generickou Next.js chybovou stránkou bez brandingu. Doplnit `src/app/[locale]/error.tsx` ve stejném stylu jako nová 404.

---

### [ ] N6. Chybí `loading.tsx` pro streamovaný obsah

Po převedení `/shop` na Server Component (C2) dává smysl přidat `loading.tsx` se stávajícím skeletonem, aby uživatel viděl okamžitou odezvu.

---

### [ ] N7. `formatPhoneDigits` může vyrobit telefon přesně na hraně limitu

**Soubor:** `src/app/[locale]/shop/checkout/page.tsx:18-21`

12 číslic + předvolba + mezery = přesně 20 znaků, což je horní hranice `MAX_LEN.customerPhone` i `PHONE_RE`. Jakékoliv budoucí rozšíření formátu to utne. Zvednout limit na 24 pro rezervu.

---

### [x] N8. Duplicitní dotaz na DB při zobrazení detailu produktu

Po C2 zmizí sám; do té doby stojí za zmínku, že `layout.tsx` (metadata) a klientský `fetch` načtou tentýž produkt dvakrát na každé zobrazení.

---

### [ ] N9. `/api/check` nemá rate limit

**Soubor:** `src/app/api/check/route.ts`

ID registrací jsou cuid (nehádatelné), takže riziko enumerace je nízké — ale endpoint je neomezený DB dotaz dostupný komukoliv. Přidat limit ~60/h.

---

### [ ] N10. Vrátit `NotFoundView` zpět do jednoho souboru, až to Next umožní

**Soubory:** `src/app/[locale]/not-found.tsx` + `not-found-view.tsx`

Rozdělení existuje jen proto, že `not-found.tsx` nemůže být `"use client"` a zároveň exportovat `metadata`. Až next-intl / Next tenhle vzor zjednoduší, sloučit zpět.

---

### [ ] N11. Skript `scripts/seedAdmin.mjs` není zdokumentovaný v README

Pro nasazení na čistou databázi je nutné vytvořit admin účet. Doplnit do README krok `npm run seed:admin` včetně požadavků na sílu hesla.

---

## Co je v pořádku (ověřeno)

- **Atomicita skladu** — `updateMany` s `quantity: { gte: qty }` uvnitř transakce, race-safe.
- **Atomicita kupónů** — raw SQL `UPDATE ... WHERE usedCount < maxUses`, race-safe; rollback vrátí i sklad.
- **Ceny se nikdy nedůvěřují klientovi** — checkout si vždy načte variantu ze serveru.
- **Všechny admin API routy mají autorizační bránu** (ověřeno: počet `getAdminFromReq` ≥ počet handlerů ve všech 18 souborech).
- **Žádný secret v klientském bundlu** — jediná `NEXT_PUBLIC_*` proměnná je `NEXT_PUBLIC_URL`; `.env` je v `.gitignore` a není trackovaný.
- **CSRF** — admin i crew cookie mají `sameSite: "lax"`, což blokuje cross-site POST.
- **Crew token** je HMAC podepsaný s `timingSafeEqual`.
- **Košík je persistovaný** v `localStorage` přes `zustand/persist`; hydratace je ošetřená `mounted` flagem, takže nehrozí hydration mismatch.
- **JSON-LD injection** — `jsonLdScript()` escapuje `<`, takže admin-zadaný popis nemůže vylézt ze `<script>` tagu.
- **Čistý kód** — žádné `any`, žádné `console.log`, žádné `TODO`/`FIXME`; `tsc --noEmit` i `next build` procházejí bez chyb.
