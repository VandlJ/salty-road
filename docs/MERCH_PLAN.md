> **VYŘEŠENO** — všechny kroky hotové, merch e-shop je v produkci. Ponecháno pro historii.

# Merch E-shop — Implementation Plan

Small merch shop (mikiny, trička, voňavky, čepice) bolted onto the existing Salty Road Meet event site. Payment: bank transfer (SPD QR) or cash on delivery — no payment gateway.

Tracked here so progress survives context resets. Update the checkboxes as steps land.

## Architecture decisions (locked in)

- **Catalog fully in DB** (not static config) — admin needs to add/edit cap designs without a deploy.
- `MerchVariant.label` is free text (e.g. "M / Černá", "Design: Shark") — no rigid size/color attribute schema. Overkill for 4 product types.
- `Order.items` stores a **snapshot** (name, label, price at order time), not just a `sku` reference — editing/deleting a product later must not corrupt historical orders.
- Stock decrement happens inside a `prisma.$transaction` with the order creation — atomic, prevents overselling.
- Price is always recomputed **server-side** from the DB at checkout — cart store price is display-only, never trusted.
- Reuses existing infra: Prisma/Postgres, Vercel Blob (`/api/upload`), Resend (`sendEmail`), `adminAuth`, `rateLimit`, `SectionHeading`, next-intl (cs/en).
- `/shop` route already exists as a placeholder (noindex, mock skeleton) — reused, not replaced with a new route. Remove the `noindex` and nav-link comment-out once real content lands.
- `generateSPD` in `src/lib/qr.ts` is currently hardcoded to the event registration fee — generalized to accept `{ amount, message }`.

## Data model

```prisma
model MerchProduct {
  id          String   @id @default(cuid())
  slug        String   @unique
  category    String   // "hoodie" | "tshirt" | "car-scent" | "cap"
  name        String
  description String
  active      Boolean  @default(true)
  createdAt   DateTime @default(now())
  variants    MerchVariant[]
}

model MerchVariant {
  id        String       @id @default(cuid())
  productId String
  product   MerchProduct @relation(fields: [productId], references: [id], onDelete: Cascade)
  sku       String       @unique
  label     String
  price     Int          // halíře
  quantity  Int          @default(0)
  image     String?      // Vercel Blob URL
  active    Boolean      @default(true)

  @@index([productId])
}

model Order {
  id            String   @id @default(cuid())
  createdAt     DateTime @default(now())
  customerName  String
  customerEmail String
  address       String
  items         Json     // [{ sku, name, label, price, qty }] — snapshot at order time
  totalAmount   Int      // halíře
  paymentMethod String   // "bank_transfer" | "cod"
  status        String   @default("pending") // "pending" | "paid" | "shipped"

  @@index([status])
}
```

## Steps

- [x] **1. Prisma schema + migration** — `MerchProduct`, `MerchVariant`, `Order` models, `prisma migrate dev` (migration `20260729123310_add_merch_and_orders`)
- [x] **2. Generalize `generateSPD`** in `src/lib/qr.ts` to `{ amount, message }`; update the existing registration-fee caller
- [x] **3. Public product API + storefront** — `GET /api/merch/products` (list), `GET /api/merch/products/[slug]` (detail); `/shop` listing + `/shop/[slug]` detail (variant picker), reusing `SectionHeading`. `/shop` noindex removed, real metadata added. Nav link + mobile menu link uncommented.
- [x] **4. Cart** — Zustand store (`src/lib/cartStore.ts`, `persist` to localStorage) + `/shop/cart` page + `CartLink` nav icon w/ count badge. Verified end-to-end in browser (add → cart → remove), test data cleaned up.

  **Gotcha found & fixed:** with the Accelerate-extended Prisma client, a nested `orderBy: { label: "asc" }` (string literal) inside `include` silently breaks TS inference for the whole include (relation typed as missing). Fix: use `Prisma.SortOrder.asc` instead. Documented inline in both `/api/merch/products` routes.
- [x] **5. Checkout** — `POST /api/merch/checkout` (rate limit, validate incl. phone, recompute price server-side from DB, transactional atomic stock decrement via conditional `updateMany`, create `Order`, confirmation email + admin notification) + `/shop/checkout` form + `/shop/thank-you` (SPD QR for `bank_transfer`, reads result from `sessionStorage`, no unauthenticated order-lookup endpoint). `Order.customerPhone` added (migration `20260729124709_add_order_phone`). Verified end-to-end incl. overselling rejection (409 `insufficient_stock`), test data cleaned up.
- [x] **6. Admin: `/admin/merch`** — REST CRUD (`/api/admin/merch/products[/[id]][/variants]`, `/api/admin/merch/variants/[id]`), inline product/variant editing, `active` toggles, delete w/ confirm modal, image upload (reuse `/api/upload`, now takes an optional `folder` field — `"merch"` | `"registrations"`, allowlisted). Extracted `useAdminAuth` hook + `AdminLoginForm` (shared, reusable by `/admin/orders` next) instead of duplicating the login gate. Verified end-to-end with a throwaway admin account (create/edit/delete product+variant, cascade delete, price/qty persistence) — all pass. **Known env issue, not a code bug:** image upload 500s in this dev environment because `BLOB_READ_WRITE_TOKEN` rejects the request ("Access denied") — reproduces identically on the pre-existing `/api/upload` default path too, so it's a token/environment problem, not a regression.
- [x] **7. Admin: `/admin/orders`** — `GET/PATCH /api/admin/orders[/[id]]`, order list with customer/items/total, status `<select>` (`pending`/`paid`/`shipped`, optimistic update w/ revert on failure). Verified end-to-end with a throwaway admin account + test order (status change persisted correctly), cleaned up.

## Status: all 7 steps complete.

## Open items / decide later

- CS/EN translation keys for all new UI (follow existing `messages/cs.json` / `messages/en.json` pattern)
- Whether `/api/upload` needs a path-prefix param to separate `merch/` blobs from `registrations/` blobs (currently hardcodes `registrations/`)
