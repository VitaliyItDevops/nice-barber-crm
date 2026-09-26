# Nice Barber Admin CRM

Internal dashboard for the barbershop owner: schedule, clients, analytics, staff, services.

## Setup

1. Create a Supabase project.
2. In **SQL Editor**, run in order:
   - `sql/schema.sql`
   - `sql/seed.sql`
3. Create one admin user in Supabase **Authentication → Users** (email/password). No public signup.
4. Copy `.env.example` to `.env.local` and set:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Install and run:

```bash
npm install
npm run dev
```

Open http://localhost:3000 — you will be redirected to `/login`.

## Routes

| Path | Page |
|------|------|
| `/login` | Sign in |
| `/` | Schedule |
| `/clients` | Clients |
| `/analytics` | Analytics |
| `/staff` | Staff & time off |
| `/services` | Service pricing |

## Notes

- Seed bookings are generated relative to **2026-09-26** so analytics patterns (incl. Friday evening no-shows) are reproducible.
