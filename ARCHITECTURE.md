# Bethel Divine Healthcare — System Architecture Blueprint

## Tech Stack
- Frontend: Next.js 14 (App Router, TypeScript)
- Database/Auth: Supabase (Postgres + RLS + Auth)
- Hosting: Vercel → betheldivine.com
- AI: Anthropic Claude API (server-side only, never exposed to client)
- Payments: Stripe (client balance model, saved card on file)
- Accounting: QuickBooks Online API (sync Stripe payments)
- Visit Verification: Maryland EVV / Sandata
- Styling: Tailwind CSS
- Fonts: Lora (headings), Source Sans 3 (body) via Google Fonts

## Color System
- Navy: #1a2e4a
- Navy Deep: #122038
- Navy Mid: #223a5e
- Gold: #c8991a
- Gold Light: #e8b830
- Off White: #f7f9fc
- Gray 200: #dce2ec
- Gray 400: #8e9ab0
- Green: #2d8a5e
- Red: #c0392b
- Teal: #1a6b7c

## Roles
1. admin — full system control, role assignment, audit log, infrastructure settings
2. owner — operational control (schedule, clients, payments, time-off approvals) — cannot change roles or settings
3. employee — clock in/out, view assigned clients, submit medication logs, incident reports, request time off
4. client — view care summary, pay monthly balance via Stripe, submit reports, view medication history
5. pending — default role on signup, no dashboard access until admin assigns real role

## Database Schema

### profiles (extends auth.users)
- id: uuid FK → auth.users
- full_name: text
- email: text
- role: enum pending | admin | owner | employee | client
- is_active: boolean
- created_at: timestamp
- updated_at: timestamp

### clients
- id: uuid
- profile_id: uuid FK → profiles
- date_of_birth: date
- address: text
- emergency_contact: jsonb
- assigned_employees: uuid[]
- insurance_info: jsonb
- created_at: timestamp

### employees
- id: uuid
- profile_id: uuid FK → profiles
- hire_date: date
- position: text
- certifications: jsonb
- assigned_clients: uuid[]
- hourly_rate: decimal
- created_at: timestamp

### shifts
- id: uuid
- employee_id: uuid FK → employees
- client_id: uuid FK → clients
- scheduled_start: timestamp
- scheduled_end: timestamp
- actual_start: timestamp
- actual_end: timestamp
- status: enum scheduled | active | completed | missed
- evv_verified: boolean
- notes: text

### time_off_requests
- id: uuid
- employee_id: uuid FK → employees
- start_date: date
- end_date: date
- reason: text
- status: enum pending | approved | denied
- reviewed_by: uuid FK → profiles
- created_at: timestamp

### clock_events
- id: uuid
- employee_id: uuid FK → employees
- client_id: uuid FK → clients
- event_type: enum clock_in | clock_out
- timestamp: timestamp
- location_lat: decimal
- location_lng: decimal
- ip_address: text
- shift_id: uuid FK → shifts

### medication_logs
- id: uuid
- client_id: uuid FK → clients
- employee_id: uuid FK → employees
- medication_name: text
- dosage: text
- administered_at: timestamp
- notes: text
- status: enum given | refused | missed

### payments
- id: uuid
- client_id: uuid FK → clients
- stripe_payment_id: text
- amount: decimal
- status: enum pending | completed | failed | refunded
- quickbooks_synced: boolean
- created_at: timestamp

### forms
- id: uuid
- name: text
- description: text
- schema: jsonb (Claude-generated field structure)
- created_by: uuid FK → profiles
- target_role: enum employee | client | all
- is_active: boolean
- created_at: timestamp

### form_submissions
- id: uuid
- form_id: uuid FK → forms
- submitted_by: uuid FK → profiles
- client_id: uuid FK → clients (nullable)
- data: jsonb
- ai_summary: text (nullable)
- created_at: timestamp

### audit_logs
- id: uuid
- actor_id: uuid FK → profiles
- action: text
- target_table: text
- target_id: uuid
- metadata: jsonb
- created_at: timestamp

## Route Structure
app/
├── (auth)/
│   ├── login/
│   ├── register/
│   └── pending/
├── (dashboard)/
│   ├── layout.tsx — shared sidebar/topbar shell
│   ├── admin/
│   │   ├── page.tsx
│   │   ├── users/
│   │   ├── forms/
│   │   ├── reports/
│   │   ├── audit/
│   │   └── settings/
│   ├── owner/
│   │   ├── page.tsx
│   │   ├── employees/
│   │   ├── clients/
│   │   ├── schedule/
│   │   ├── payments/
│   │   └── time-off/
│   ├── employee/
│   │   ├── page.tsx
│   │   ├── schedule/
│   │   ├── clients/
│   │   ├── logs/
│   │   ├── forms/
│   │   └── time-off/
│   └── client/
│       ├── page.tsx
│       ├── payments/
│       ├── reports/
│       └── history/
└── api/
    ├── ai/
    │   ├── generate-form/
    │   ├── summarize-report/
    │   └── shift-summary/
    ├── stripe/
    │   ├── create-payment/
    │   └── webhook/
    ├── quickbooks/
    │   └── sync/
    └── evv/
        └── submit/

## Middleware Logic
- Runs on every request
- Reads Supabase session + role
- pending → /pending
- admin → /admin
- owner → /owner
- employee → /employee
- client → /client
- Blocks cross-role route access

## Claude API Rules
- NEVER expose API key to client
- All Claude calls go through /api/ai/* server routes only
- Form builder: user prompt → Claude → JSON schema → saved to forms table → static from that point
- No Claude calls happen at form render time, only at creation

## Build Phases
Phase 1: Scaffold, Supabase schema, auth pages, middleware, pending screen, dashboard shells
Phase 2: Clock in/out, shift scheduling, time off requests, client management, medication logs
Phase 3: Claude form builder, dynamic form renderer, form submissions
Phase 4: Stripe payment flow, QuickBooks sync, EVV submission
Phase 5: AI reporting, notifications (Resend email + web push), mobile polish
