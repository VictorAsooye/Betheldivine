# Bethel Divine Healthcare Services — Internal Portal

Internal operations portal for Bethel Divine Healthcare Services. Manages employees, clients, scheduling, clock-in/out with GPS, electronic visit verification (EVV), billing, AI-generated reports, push notifications, and compliance tracking.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Database | Supabase (PostgreSQL + RLS) |
| Auth | Supabase Auth |
| Payments | Stripe |
| Email | Resend |
| AI | Anthropic Claude (`claude-sonnet-4-6`) |
| Accounting | QuickBooks Online (OAuth 2.0) |
| EVV | Sandata (Maryland Medicaid) |
| Push | Web Push (VAPID) |
| Deployment | Vercel |

---

## Local Development

### 1. Clone and install

```bash
git clone https://github.com/your-org/bethel-divine.git
cd bethel-divine
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in your credentials. See `.env.example` for descriptions of each variable and where to find them.

Minimum required for local development:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

All other services degrade gracefully when keys are not set (EVV logs to console, emails are skipped, AI returns errors).

### 3. Run database migrations

In your Supabase project's SQL Editor, run each file in order:

```
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_rls_policies.sql
supabase/migrations/003_notifications.sql
supabase/migrations/004_push_subscriptions.sql
supabase/migrations/005_reports.sql
supabase/migrations/006_audit_log.sql
supabase/migrations/007_indexes.sql
```

### 4. Seed development data (optional)

Paste contents of `supabase/seed.sql` into the Supabase SQL Editor and run.

> **Warning:** Development data only. Never run in production.

Seeded accounts:
- Admin: `victor@betheldivine.com`
- Owner: `dr.asooye@betheldivine.com`
- Employee: `john.smith@betheldivine.com`
- Employee: `sarah.jones@betheldivine.com`

All seeded users need passwords set via Supabase Auth Dashboard or the Supabase CLI.

### 5. Start development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Folder Structure

```
bethel-divine/
├── app/
│   ├── (auth)/              # Login, signup, password reset pages
│   ├── (dashboard)/         # Protected app pages
│   │   ├── admin/           # Admin-only: users, licenses, reports, settings, audit
│   │   ├── owner/           # Owner-only: clients, employees, time-off, billing
│   │   └── employee/        # Employee: dashboard, schedule, clock, clients, licenses
│   ├── api/                 # API route handlers
│   │   ├── ai/              # Claude AI report generation
│   │   ├── clock/           # Clock in/out
│   │   ├── evv/             # Electronic visit verification
│   │   ├── licenses/        # License CRUD
│   │   ├── notifications/   # Notification management
│   │   ├── payments/        # Billing utilities
│   │   ├── push/            # Web push subscription management
│   │   ├── quickbooks/      # QuickBooks OAuth + sync
│   │   ├── shifts/          # Shift CRUD
│   │   ├── stripe/          # Stripe payments + webhook
│   │   └── time-off/        # Time-off requests
│   ├── globals.css
│   └── layout.tsx           # Root layout, PWA manifest, service worker
├── components/              # Shared UI components
├── lib/
│   ├── audit.ts             # Audit log writer
│   ├── evv.ts               # EVV submission logic
│   ├── notifications/       # In-app notification creator
│   ├── push.ts              # Web push sender
│   ├── stripe.ts            # Stripe client
│   ├── supabase/            # Supabase client factories (server + browser)
│   └── email/               # Resend email sender + templates
├── middleware.ts            # Auth middleware — protects /dashboard routes
├── public/
│   ├── manifest.json        # PWA manifest
│   └── sw.js                # Service worker (push + notification click)
├── supabase/
│   ├── migrations/          # SQL migration files (run in order)
│   └── seed.sql             # Development seed data
├── .env.example             # Environment variable documentation
└── DEPLOYMENT.md            # Vercel deployment guide
```

---

## Running Migrations

Migrations are plain `.sql` files — no migration CLI is used. Run them manually in the Supabase SQL Editor in the numbered order shown in the file names.

If you add a new migration:
1. Create `supabase/migrations/NNN_description.sql` (increment NNN)
2. Write forward-only SQL (no rollback scripts — see `DEPLOYMENT.md` for rollback strategy)
3. Test on a staging project before running in production

---

## Adding a New Role or Permission

Roles are stored as a `role` column in the `profiles` table. Current values: `admin`, `owner`, `employee`, `client`.

### To add a new role (e.g., `supervisor`):

1. **Update the check constraint** in a new migration:

```sql
-- supabase/migrations/NNN_add_supervisor_role.sql
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'owner', 'employee', 'client', 'supervisor'));
```

2. **Update RLS policies** — add the new role wherever it needs read/write access:

```sql
CREATE POLICY "supervisor_read_shifts" ON shifts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'owner', 'supervisor')
    )
  );
```

3. **Update API route guards** — search for `["admin", "owner"]` patterns in `app/api/` and add the new role where appropriate.

4. **Update middleware** in `middleware.ts` if the new role needs access to specific route groups.

5. **Add sidebar navigation** in `components/Sidebar.tsx` under the new role's section.

---

## Key Environment Variables

See `.env.example` for the full list with descriptions. The most critical:

- `SUPABASE_SERVICE_ROLE_KEY` — bypasses RLS; server-side only, never expose to client
- `STRIPE_WEBHOOK_SECRET` — validates Stripe webhook payloads; must match the registered endpoint
- `ANTHROPIC_API_KEY` — used only in `/api/ai/*` routes; server-side only
- `VAPID_PRIVATE_KEY` — must never change after push subscriptions exist
- `MARYLAND_EVV_API_KEY` — optional; EVV is skipped/logged locally if not set

---

## Contact

Victor Asooye — victor@betheldivine.com
