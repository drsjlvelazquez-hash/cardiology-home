# Supabase Migration Plan

Goal: replace per-device localStorage with a shared database so a patient can
log weights from their phone and the physician dashboard sees every patient
from the clinic.

## Why this is a contained change

All storage in the app goes through one object — `DB` in
`src/MonitorPlatform.jsx` — with four methods: `get`, `set`, `list`, `del`.
Swapping its internals to Supabase calls leaves the rest of the app untouched.

## Steps

1. **Create a Supabase project** (free tier is fine to start) at supabase.com.
2. **Create the table** (SQL editor):

   ```sql
   create table patients (
     id text primary key,              -- the HF-XXXX code
     baseline numeric,
     entries jsonb default '[]',       -- [{date, weight}]
     last_analysis jsonb,
     last_tier int,
     created_at date default now(),
     last_updated date default now()
   );

   alter table patients enable row level security;

   -- Patients look themselves up by code; the code IS the secret
   -- (same pseudonymization model as today).
   create policy "read own row" on patients for select using (true);
   create policy "insert" on patients for insert with check (true);
   create policy "update own row" on patients for update using (true);
   ```

3. **Install the client:** `npm install @supabase/supabase-js`, add
   `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to `.env` and to the
   Cloudflare dashboard variables.
4. **Rewrite `DB`** to map:
   - `get("hf_pt_CODE")` → `select * from patients where id = CODE`
   - `set("hf_pt_CODE", data)` → `upsert` into `patients`
   - `get("hf_ids")` / `list` → `select id from patients` (dashboard only)
   - `del` → `delete from patients where id = CODE`
   - `hf_config` (PIN, alert email, EmailJS settings) can stay in
     localStorage — it's per-clinic-device configuration, not patient data.

## Security decisions to make before going live

- **Dashboard access:** with the anon key, anyone could technically list all
  codes. Options, in increasing strength:
  1. Accept it (codes are pseudonymous — no names, no identifiers), same as today.
  2. Move the dashboard's "list all patients" query into a Cloudflare Pages
     Function that checks the PIN server-side and uses the Supabase
     service-role key (kept as a Cloudflare secret).
- **PIN:** currently stored client-side; if the dashboard moves behind a
  serverless function, the PIN check moves there too.
- The privacy model (no names, code-to-patient mapping stays on paper in the
  clinic) carries over unchanged and is the main HIPAA-exposure mitigation.

## Rollout

1. Ship Cloudflare deploy with localStorage first (already done).
2. Add Supabase behind the same `DB` interface.
3. On first load with Supabase enabled, migrate any local `hf_pt_*` records up
   to the database, then treat Supabase as the source of truth.
