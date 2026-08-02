# Final Launch Audit — Salty Road

**Datum:** 2. 8. 2026
**Rozsah:** kompletní repozitář (37 API rout, admin rozhraní, checkout flow, veřejné formuláře)
**Metodika:** Red Team / paranoidní audit před Go-Live. Whitecoding — žádný kód nebyl upraven, tohle je pouze seznam nálezů.

---

## Executive summary

Projekt je v **výrazně lepším stavu, než je u Next.js e-shopů obvyklé**. Konkrétně:

- **Všech 19 admin API rout má auth guard** — prošel jsem je jednu po druhé, žádná není nechráněná. To je nález, který u podobných auditů obvykle vypadává jako CRITICAL, tady je čistý.
- **Ceny se nikdy neberou od klienta.** `checkout/route.ts:131-135` načítá varianty z DB podle SKU, klient posílá pouze `{ sku, qty }`. Cenu voňavky na 0 Kč z konzole změnit nejde.
- **Double-submit je ošetřen** idempotency klíčem (`checkout/route.ts:149-152`) i atomickým odečtem skladu.
- **E-mail selhání neshodí objednávku** — `after()` blok je celý v try-catch (`checkout/route.ts:312-355`).
- Bezpečnostní hlavičky, timing-safe porovnání PINu, bcrypt s konstantním časem, sanitizace SPD platebního řetězce i JSON-LD — všechno na místě.

**Žádný nález kategorie "okamžitě odloží launch" jsem nenašel.** Níže uvedené položky jsou reálné, ale jde o zpevňování, ne o díry, kterými teče krev.

Nejvyšší priorita před spuštěním: **S1 (chybějící CSP)**, **B1 (unbounded `limit` v `/api/vehicles`)**, **B2 (duplicitní registrace)**.

---

## SECURITY CRITICAL

### [x] S1 — Chybí Content-Security-Policy hlavička
**Soubor:** `next.config.ts:22-39`

Máme `X-Frame-Options`, `nosniff`, HSTS, `Referrer-Policy` i `Permissions-Policy`. CSP ale chybí úplně. To je poslední velká vrstva obrany proti XSS — pokud by se někdy podařilo propašovat skript (např. přes budoucí `dangerouslySetInnerHTML` nebo kompromitovanou npm závislost), nic ho nezastaví.

Riziko: samo o sobě nic neotevírá, ale je to jediná chybějící vrstva defense-in-depth. U e-shopu, kde se zadává adresa a e-mail, stojí za to.

```ts
// next.config.ts — inside the headers() array
{
  key: 'Content-Security-Policy',
  value: [
    "default-src 'self'",
    // Next.js injects inline bootstrap scripts; 'unsafe-inline' is
    // required unless you switch to a nonce-based setup in middleware.
    "script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://*.public.blob.vercel-storage.com",
    "font-src 'self' data:",
    "connect-src 'self' https://api.mapy.cz https://va.vercel-scripts.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; '),
},
```

Nasadit nejdřív jako `Content-Security-Policy-Report-Only`, zkontrolovat konzoli na produkci, teprve pak přepnout na ostrou.

---

### [x] S2 — Admin session tokeny jsou v DB v plaintextu
**Soubor:** `src/lib/adminAuth.ts:22`, `src/app/api/admin/login/route.ts:26`

`prisma.admin.update({ data: { sessionToken: token } })` ukládá token přesně tak, jak ho dostane prohlížeč v cookie. Kdyby kdokoliv získal read-only přístup k DB (leaknutý backup, nesprávně nastavené oprávnění na Prisma Accelerate, SQL injection kdekoliv jinde), může tokeny rovnou vložit do cookie a je adminem — nemusí lámat žádné heslo.

Hesla samotná jsou správně bcryptovaná; tohle je jen o session tokenech.

```ts
// src/lib/adminAuth.ts
import { createHash } from "crypto";

// Store only a hash — a leaked DB dump then contains no usable session.
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function getAdminFromReq() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  if (!token || tokenExpired(token)) return null;
  return prisma.admin.findFirst({ where: { sessionToken: hashToken(token) } });
}
```

Login route pak ukládá `hashToken(token)` do DB a posílá `token` do cookie. Logout hledá podle `hashToken(token)`.

**Pozor:** změna odhlásí všechny stávající admin sessions (uložené plaintext tokeny přestanou sedět) — nasadit v klidném okně.

---

### [x] S3 — Jedna session na admina; nová přihlášení tiše odhlašují stará
**Soubor:** `prisma/schema.prisma:20` (`sessionToken String?`), `src/app/api/admin/login/route.ts:26`

Admin má v DB jediné pole `sessionToken`. Přihlášení z mobilu odhlásí notebook a naopak. Není to bezpečnostní díra, ale při akci, kdy jsou na místě dva lidé se stejným účtem, se budou navzájem vyhazovat.

Zároveň to znamená, že **nejde odhlásit "všechna zařízení kromě tohoto"** ani vidět, kolik sessions je aktivních.

Řešení: samostatná tabulka `AdminSession` (id, adminId, tokenHash, expiresAt, createdAt, userAgent). Zapadá to i do S2.

---

### [x] S4 — `getClientIp` důvěřuje `x-forwarded-for` bez ověření
**Soubor:** `src/lib/rateLimit.ts:88-92`

```ts
const forwardedFor = req.headers.get("x-forwarded-for");
if (forwardedFor) return forwardedFor.split(",")[0].trim();
```

Bere **první** IP ze seznamu. Na Vercelu je to bezpečné (Vercel hlavičku přepisuje, klient ji nepodstrčí). Kdyby ale aplikace kdy běžela za jiným proxy, nebo přímo, útočník posílá `X-Forwarded-For: 1.2.3.4` s náhodnou hodnotou v každém requestu a **kompletně obchází všechny rate limity** — včetně těch na admin login (10/15 min) a checkout (20/h).

Není to dnes exploitovatelné, ale je to tichý předpoklad o hostingu, který není nikde vynucený. Minimálně to zdokumentovat, ideálně preferovat platformní hlavičku, když je k dispozici.

```ts
export function getClientIp(req: Request): string {
  // Vercel sets this itself and it can't be spoofed by the client, unlike
  // x-forwarded-for which anyone can send when not behind a trusted proxy.
  const vercelIp = req.headers.get("x-vercel-forwarded-for");
  if (vercelIp) return vercelIp.split(",")[0].trim();
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}
```

---

### [ ] S5 — Rate limity jsou v produkci bez Redisu prakticky neúčinné
**Soubor:** `src/lib/rateLimit.ts:59-66`

Kód si toho je vědom a loguje varování, ale stojí za to to říct natvrdo: **bez `REDIS_URL` každá serverless instance počítá vlastní bucket**. Vercel jich při zátěži roztočí desítky, takže limit "10 pokusů o admin login za 15 minut" znamená ve skutečnosti "10 × počet instancí".

Nejcitlivější je právě `admin-login` — brute force hesla je hlavní scénář, kde na tomhle limitu záleží.

**Před launchem ověřit, že `REDIS_URL` je na produkci opravdu nastavená.** Pokud ne, admin login limit je iluzorní.

---

### [x] S6 — Register akceptuje libovolné URL fotek od klienta
**Soubor:** `src/app/api/register/route.ts:59-61`

```ts
const uploadedUrls: string[] = Array.isArray(photos)
  ? photos.filter((p): p is string => typeof p === "string").slice(0, MAX_PHOTOS)
  : [];
```

Kontroluje se jen "je to string" a počet. Nikde se neověřuje, že URL vůbec pochází z našeho Vercel Blobu. Útočník pošle `photos: ["https://tracker.evil/pixel.jpg"]` a ta URL se uloží do DB a pak vyrenderuje v admin panelu.

Dopad je omezený tím, že `next.config.ts:11-18` má `remotePatterns` jen na `*.public.blob.vercel-storage.com` — Next Image cizí hostname odmítne. Takže výsledek je rozbitý obrázek, ne exfiltrace. Přesto: špinavá data v DB a spoléhání na konfiguraci obrázků jako na bezpečnostní kontrolu.

```ts
// src/app/api/register/route.ts
const BLOB_URL_RE = /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//;

const uploadedUrls: string[] = Array.isArray(photos)
  ? photos
      // Only accept URLs we actually issued — never trust a client-supplied
      // href just because it is a string.
      .filter((p): p is string => typeof p === "string" && BLOB_URL_RE.test(p))
      .slice(0, MAX_PHOTOS)
  : [];
```

---

### [x] S7 — Chybí typová kontrola vstupů v `/api/contact` a `/api/register`
**Soubory:** `src/app/api/contact/route.ts:20-31`, `src/app/api/register/route.ts:41-57`

Obě routy kontrolují jen truthiness (`if (!name || !email || !message)`) a pak délku **pouze pokud je hodnota string**:

```ts
if (typeof value === "string" && value.length > maxLen) { ... }
```

Když pošlu `{ name: { "$ne": null }, ... }` nebo `name: ["a","b"]`, projde to oběma kontrolami a spadne to až v Prisma → opaque 500.

**Není to injection** — Prisma je parametrizovaná, nejde jí podstrčit dotaz přes hodnotu, a Postgres není NoSQL. Je to konzistence a čistota chybových odpovědí. Přesně tenhle bug byl už opraven v checkoutu (`checkout/route.ts:83-88` — komentář to i vysvětluje), ale tyhle dvě routy zůstaly pozadu.

```ts
// Same guard the checkout route already applies — a non-string here
// otherwise skips the MAX_LEN check entirely and surfaces as a 500.
for (const field of ["name", "email", "message"] as const) {
  if (typeof body[field] !== "string") {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
}
```

---

### [x] S8 — Admin stránky nemají server-side guard, jen klientský
**Soubory:** `src/app/[locale]/admin/*/page.tsx` (všechny), `src/proxy.ts:9-11`

`src/proxy.ts` (Next 16 middleware) řeší **jen i18n** — matcher navíc explicitně vylučuje `/api`. Admin stránky se chrání až v komponentě:

```tsx
// src/app/[locale]/admin/orders/page.tsx:142
if (!loggedIn) return <AdminLoginForm onSuccess={recheck} />;
```

**Data neunikají** — každá admin API routa má vlastní guard, takže nepřihlášený uživatel dostane prázdný shell a 401 na fetch. Ale:

1. Nepřihlášený si stáhne celý JS bundle admin rozhraní (struktura, názvy endpointů, tvar formulářů) — usnadněný průzkum.
2. Krátký problik admin layoutu, než `useAdminAuth` doběhne.

Doporučení: guard přesunout do `proxy.ts` a nepřihlášené na `/admin/*` (kromě `/admin` samotného) rovnou přesměrovat.

---

## BUSINESS LOGIC RISKS

### [x] B1 — `/api/vehicles` má neomezený `limit` a chybí mu rate limit
**Soubor:** `src/app/api/vehicles/route.ts:7-9`

```ts
const page = parseInt(url.searchParams.get("page") || "1");
const limit = parseInt(url.searchParams.get("limit") || "20");
const skip = (page - 1) * limit;
```

Tři samostatné problémy v třech řádcích:

1. **`?limit=999999`** → jedním requestem se stáhne celá tabulka registrací včetně jmen, e-mailů… ne, e-maily ne (select je omezený), ale jména, značky, modely, popisy a všechny fotky. Databázi to zatíží a přenese megabajty.
2. **`?limit=abc`** → `parseInt` vrátí `NaN` → `take: NaN` → Prisma chyba → 500.
3. **`?page=-5`** → záporný `skip` → Prisma chyba → 500.

Navíc jako jediná veřejná čtecí routa **nemá rate limit** (`/api/check` má 60/h, `/api/contact` 5/h, tahle nic). Kombinace "unbounded limit + žádný rate limit" = nejlevnější způsob, jak nám vytížit databázi.

```ts
// src/app/api/vehicles/route.ts
const MAX_LIMIT = 50;

// Clamp both, and fall back on NaN — an unbounded or NaN take/skip is
// either a full-table dump or a 500 from Prisma.
const rawPage = parseInt(url.searchParams.get("page") || "1", 10);
const rawLimit = parseInt(url.searchParams.get("limit") || "20", 10);
const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), MAX_LIMIT) : 20;
const skip = (page - 1) * limit;
```

Plus přidat `rateLimit(\`vehicles:${getClientIp(req)}\`, 120, 60 * 60 * 1000)` na začátek.

---

### [x] B2 — Registrace vozu nemá ochranu proti duplicitnímu odeslání
**Soubory:** `src/components/registerForm.tsx:167-183`, `src/app/api/register/route.ts:63`

Checkout tenhle problém řeší příkladně (`idempotencyKey`, unique constraint, dedupe uvnitř transakce). Registrace ne:

- Tlačítko se disabluje přes `isSubmitting` (`registerForm.tsx:570`), což pokrývá běžný double-click.
- **Nepokrývá to ale:** síťový retry, ztracenou odpověď při přepnutí mobilní sítě, nebo uživatele, který stránku obnoví a vyplní znovu.
- Server nemá **žádnou** deduplikaci — `prisma.registration.create()` bez jakéhokoliv unique klíče.

Výsledek: dvě registrace stejného auta, obsluha řeší ručně, zákazník dostane dva potvrzovací e-maily se dvěma různými ID a neví, které platí.

Stejný vzor jako checkout: přidat `idempotencyKey String? @unique` na `Registration`, generovat ho na klientovi přes `useState(() => crypto.randomUUID())` a při konfliktu vrátit původní záznam.

---

### [x] B3 — Souběžný retry se stejným idempotency klíčem vrátí 500 místo původní objednávky
**Soubor:** `src/app/api/merch/checkout/route.ts:149-152`

```ts
if (idempotencyKey) {
  const existing = await tx.order.findUnique({ where: { idempotencyKey } });
  if (existing) return existing;
}
```

Při dvou **skutečně paralelních** requestech se stejným klíčem (nikoliv sekvenčních) obě transakce v READ COMMITTED izolaci uvidí `null`, obě projdou dál a druhá spadne na unique constraint při `create`.

**Data jsou v pořádku** — transakce se rollbackne, sklad ani kupón se nepoškodí, druhá objednávka nevznikne. Ale uživatel dostane `500 server_error` místo `201` s původní objednávkou, takže si myslí, že nákup neproběhl, a zkusí to znovu.

```ts
// In the catch block of POST, alongside INSUFFICIENT_STOCK / INVALID_COUPON:
if (
  err instanceof Prisma.PrismaClientKnownRequestError &&
  err.code === "P2002" &&
  idempotencyKey
) {
  // A concurrent retry with the same key won the race — return the order
  // it created instead of a 500 the customer would read as "try again".
  const existing = await prisma.order.findUnique({ where: { idempotencyKey } });
  if (existing) {
    // ...rebuild the same 201 response shape as the success path
  }
}
```

Pozn.: `idempotencyKey` je dnes deklarovaný uvnitř `try` bloku (`route.ts:68`), takže pro tohle bude potřeba ho vytáhnout výš — stejně jako už je vytažené `insufficientStockSku` (`route.ts:51`).

---

### [x] B4 — Dva slevové kupóny stejného typu: spotřebují se oba, uplatní se jeden
**Soubor:** `src/app/api/merch/checkout/route.ts:199-226`

Smyčka projde všechny odeslané kódy a u každého zavolá `consumeCouponUse()` (inkrementuje `usedCount`). Pokud ale někdo pošle **dva percent/fixed kódy** v obou polích (`couponCode` i `shippingCouponCode`), přiřazení `couponCode = coupon.code` a `discountAmount = ...` se prostě přepíše — vyhraje poslední.

Zákazníkovi to neuškodí (dostane slevu z jednoho, ne z obou), ale **druhý kupón se nevratně spotřebuje** i když se neuplatnil. U kupónu s `maxUses: 1` to znamená, že ho útočník takhle může "spálit" cizímu člověku, nebo ho jen omylem znehodnotí sám sobě.

Legitimní UI tohle nikdy neudělá (validate endpoint vrací typ a klient kód uloží do správného slotu), takže je to nízká priorita, ale je to skutečná ztráta hodnoty.

Fix: pokud už `couponCode !== null` a přijde druhý discount kupón, vyhodit `INVALID_COUPON` **před** zavoláním `consumeCouponUse()`.

---

### [x] B5 — `expiresAt` u kupónu se nevaliduje jako datum
**Soubor:** `src/app/api/admin/coupons/route.ts:61`

```ts
expiresAt: expiresAt ? new Date(expiresAt) : null,
```

`new Date("nesmysl")` vrátí `Invalid Date`, Prisma to odmítne a admin dostane opaque 500 místo "neplatné datum". Jen admin UX, ale je to jednořádkový fix.

Navíc: nikde se nekontroluje, že datum je v budoucnosti — dá se založit kupón, který je od začátku prošlý.

---

## UI/UX & ERROR HANDLING

### [x] U1 — `/api/register` blokuje odpověď odesláním e-mailů
**Soubor:** `src/app/api/register/route.ts:96-106`

```ts
// Await email sending to ensure execution before response closes
await Promise.all([ sendEmail(...), sendEmail(...) ]);
```

Try-catch tam je (chyba e-mailu registraci neshodí — správně), ale `await` znamená, že uživatel čeká na **dvě volání Resend API**, než dostane odpověď. Při pomalém Resendu to je několik sekund koukání do spinneru.

Checkout tenhle problém už řeší přes `after()` z `next/server` (`checkout/route.ts:312`) — přesně na tohle. Komentář v register routě ("to ensure execution before response closes") popisuje omezení, které `after()` odstraňuje.

Stejné platí pro `/api/contact` (`contact/route.ts:36-44`).

---

### [x] U2 — Chybí `loading.tsx` u většiny rout
**Soubory:** existuje pouze `src/app/[locale]/shop/loading.tsx`

Detail produktu (`/shop/[slug]`), stránka vozů, `/check` a další nemají loading fallback. Při pomalé DB (Prisma Accelerate cold start) uživatel vidí prostě nic, dokud se stránka nedorenderuje.

Admin stránky mají vlastní skeletony v komponentách, takže tam je to pokryté.

---

### [x] U3 — Chybí `global-error.tsx`
**Soubory:** `src/app/[locale]/error.tsx` existuje, root-level nikoliv

`error.tsx` uvnitř `[locale]` nepokryje chyby v samotném root layoutu (`src/app/[locale]/layout.tsx`) ani v i18n providerech. Když spadne něco tam, uživatel dostane výchozí bílou Next.js chybovou stránku bez našeho brandingu.

---

### [x] U4 — Registrační formulář má tichý dead-end při nahrávání fotek
**Soubor:** `src/components/registerForm.tsx:157-161`

```ts
if (photos.length > 0 && validPhotos.length === 0 && photos.some(p => p.loading)) {
   // Wait for uploads? For now, just error or block button.
   // Ideally button is disabled while loading.
   return;
}
```

`return` bez nastavení chyby a bez `setIsSubmitting`. Uživatel klikne na Odeslat a **nestane se vůbec nic** — žádná hláška, žádný spinner. Komentář sám přiznává, že je to nedodělek.

V praxi to částečně kryje `disabled={... || isUploading}` na tlačítku, ale tahle větev je pořád dosažitelná (např. fotka, která se začne nahrávat těsně po kontrole `isUploading`).

---

## CLEANUP

### [x] C1 — Nekonzistentní fallback URL webu
**Soubory:** `src/app/api/register/route.ts:79`, `src/lib/emailPreview.ts:55`

```ts
const siteUrl = process.env.NEXT_PUBLIC_URL || "https://saltyroad.cz";
```

Kanonická doména je `https://www.saltyroad.cz` (`src/lib/seo.ts:4`) — apex 307-redirectuje, což nás už jednou vytrestalo u smoke testu. Když `NEXT_PUBLIC_URL` chybí, odkazy v e-mailech vedou přes zbytečný redirect.

Použít importovanou `SITE_URL` místo hardcoded stringu.

---

### [x] C2 — Root repozitáře je zaplevelený plánovacími dokumenty
**Soubory:** `Audit_Production_Ready.md` (25 KB), `MERCH_PLAN.md`, `Test_Implementation_Plan.md` (28 KB), `WARP.md`, a nově tenhle soubor

Jde o interní pracovní dokumenty. `Audit_Production_Ready.md` je navíc předchozí verze auditu, jehož nálezy jsou už z velké části vyřešené — někdo, kdo repozitář uvidí poprvé, bude řešit neexistující problémy.

Doporučení: přesunout do `docs/` a u hotových auditů doplnit hlavičku "vyřešeno, ponecháno pro historii".

---

### [x] C3 — `.DS_Store` v pracovním adresáři
**Soubor:** `.DS_Store` (6 KB)

Není v gitu (`git ls-files` ho nevrací), ale ani v `.gitignore` — takže se do commitu dostane, jakmile někdo udělá `git add -A` v jiné podsložce. Přidat `.DS_Store` do `.gitignore`.

---

## Co jsem ověřil a je to v pořádku

Zaznamenávám explicitně, aby se to při dalším auditu nemuselo dělat znovu:

- **Auth guard na všech 19 admin routách** — jednotlivě ověřeno, žádná výjimka.
- **Cena vždy z DB** — `checkout/route.ts:131-135`, klient posílá jen `{sku, qty}`.
- **Atomický odečet skladu** — `updateMany` s `where: { quantity: { gte: qty } }` (`route.ts:158-161`), dva paralelní nákupy posledního kusu nemůžou oba projít.
- **Atomická konzumace kupónu** — raw SQL s podmínkou `usedCount < maxUses` (`route.ts:33-38`).
- **Idempotence checkoutu** — unique `idempotencyKey`, dedupe v transakci.
- **E-mail selže → objednávka zůstane** — `after()` + try-catch (`route.ts:312-355`).
- **Timing-safe porovnání** PINu i podpisu crew tokenu (`crewAuth.ts:17-21`), konstantní čas bcryptu i pro neexistujícího uživatele (`login/route.ts:22-24`).
- **SPD sanitizace** platebního řetězce proti injection druhého pole (`qr.ts:19-21`, pokryto testem).
- **JSON-LD escaping** `</script>` (`seo.ts:29-31`).
- **`/api/upload`**: admin guard na `merch` složku, allowlist typů, limit velikosti, `contentType` se nikdy nebere z klientské hlavičky (`upload/route.ts:53`).
- **Cron endpoint** vyžaduje `Bearer ${CRON_SECRET}` a odmítne běžet, pokud secret není nastavený (`cron/cleanup/route.ts:9-16`).
- **`/api/entry`** vyžaduje crew token nebo admin session, vrací jen nezbytná pole.
- **Žádný `console.log`** v `src/`, **žádné TODO/FIXME/HACK**, **žádný mrtvý kód** v `components/` ani `lib/`.
- **`.env` není v gitu**, trackovaný je jen `.env.example`.
- **Žádný `dangerouslySetInnerHTML`** mimo tři JSON-LD bloky, všechny přes escapující `jsonLdScript()`.

---

## Navržené pořadí oprav

| # | Nález | Proč právě teď | Odhad |
|---|---|---|---|
| 1 | **S5** ověřit `REDIS_URL` na produkci | Nulová práce, ale rozhoduje o tom, jestli admin login vůbec má rate limit | 5 min |
| 2 | **B1** clamp `limit`/`page` + rate limit | Nejlevnější dostupný způsob, jak nám někdo vytíží DB | 15 min |
| 3 | **S1** CSP (nejdřív Report-Only) | Poslední chybějící bezpečnostní vrstva | 30 min |
| 4 | **S7** typové guardy v contact/register | Stejný bug, jaký už byl opraven v checkoutu | 20 min |
| 5 | **S6** validace blob URL v register | Špinavá data v DB | 10 min |
| 6 | **U1** e-maily přes `after()` | Přímo znatelné zrychlení registrace pro uživatele | 20 min |
| 7 | **B2** idempotence registrace | Duplicitní registrace = ruční práce pro obsluhu | 1 h |
| 8 | **S2 + S3** hashované tokeny + tabulka sessions | Nejcennější zpevnění, ale odhlásí stávající sessions | 2 h |
| 9 | **B3, B4, B5, U2–U4, C1–C3** | Polish, dá se dodělat po launchi | dle kapacity |

Body 1–6 jsou zhruba **hodina a půl práce** a pokrývají všechno, co bych chtěl mít hotové před spuštěním.
