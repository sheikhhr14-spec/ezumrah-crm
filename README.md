# EzUmrah CRM

Cloud CRM for Umrah & Hajj travel agencies — bookings, packages, flights, hotels,
visas, transport & ziyarah, invoicing, quotations, document vault and tasks.
Built with Next.js 14 + Supabase (PostgreSQL), deployed on Vercel.

## Modules
- **Auth** — Supabase email/password, login + agency signup
- **Billing** — Stripe Checkout subscription (credit card required), 3 plans
- **Customers** — pilgrims with passports & WhatsApp
- **Bookings** — Umrah / Hajj / holiday trips with auto refs (EZ-YYYY-NNNN)
- **Packages** — umrah, hajj, ziyarah, hotel, flight, transport packages
- **Booking detail** — flights, hotels, visas, transport/ziyarah per booking
- **Invoices & Quotations** — auto-numbered (INV-/QT-YYYY-NNNN)
- **Documents** — vault with expiry tracking (Supabase Storage URLs)
- **Tasks** — priorities, booking links, done/reopen

## Setup
1. `npm install`
2. Copy `.env.example` → `.env.local`, fill Supabase keys
3. `npm run dev` → http://localhost:3000

## Env vars (Vercel)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only)
- `STRIPE_SECRET_KEY` (enables card checkout)
- `NEXT_PUBLIC_APP_URL` (e.g. https://crm.ezumrah.com)

## Database
Schema lives in `schema.sql` + `schema-additions.sql` (already applied).
