# Salty Road Meet

Event site for the Salty Road Meet car meet (Prachatice, CZ): vehicle registration with photo upload and admin approval, public gallery of confirmed vehicles, registration status lookup, PIN-gated crew check-in at the door, and a password-protected admin panel.

Built with Next.js 16 (App Router), Prisma + PostgreSQL, next-intl (CS/EN), Tailwind CSS v4, Vercel Blob for photo storage, and Resend for transactional email.

## Getting started

```bash
npm install
cp .env.example .env   # fill in real values, see below
npx prisma migrate dev
ADMIN_PASSWORD=your-secret npm run seed:admin
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

See `.env.example` for the full list with descriptions. Required to run at all:

- `DATABASE_URL`, `DIRECT_DATABASE_URL` — PostgreSQL (Prisma Accelerate compatible)
- `BLOB_READ_WRITE_TOKEN` — Vercel Blob storage for registration photos
- `RESEND_API_KEY`, `EMAIL_FROM`, `ADMIN_EMAIL` — transactional email
- `BANK_ACCOUNT_IBAN` — bank account encoded into the payment QR code sent on approval
- `ENTRY_PIN`, `ENTRY_SESSION_SECRET` — crew PIN login for the `/entry` check-in page
- `CRON_SECRET` — bearer token required by `/api/cron/cleanup`

Optional:

- `REDIS_URL` — shared rate limiting across serverless instances, backed by a self-hosted Redis. Without it, rate limits fall back to a per-instance in-memory counter — good enough to blunt casual abuse, not a hard guarantee under real load.

## Scripts

```bash
npm run dev              # start dev server (Turbopack)
npm run build             # prisma generate + production build
npm run start              # run production build
npm run lint                # eslint
ADMIN_PASSWORD=... npm run seed:admin   # create/update the admin user
node scripts/clearRegistrations.mjs --confirm   # wipe all registrations (destructive)
TEST_EMAIL=you@example.com node scripts/sendInfoEmail.mjs   # send the pre-event info email to one address; add --all to send to every accepted registration
```

## Routes

- `/` — landing page (hero, info, registration form, confirmed vehicles, sponsors)
- `/check` — look up a registration's status by ID
- `/privacy` — privacy policy
- `/entry` — PIN-gated crew check-in board (not indexed)
- `/admin` — password-gated registration management (not indexed)
- `/shop` — merch e-shop (behind an admin-controlled kill switch)
- `/shop/terms` — obchodní a reklamační podmínky (legal, Czech only)

## Deployment

Deployed on Vercel. `vercel.json` declares the daily cron job that calls `/api/cron/cleanup` to delete orphaned Blob photos (uploaded but never attached to a submitted registration). All env vars above must be set in the Vercel project settings.
