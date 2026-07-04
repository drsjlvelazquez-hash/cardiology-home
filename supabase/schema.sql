-- Heart Failure Clinic — Supabase schema
-- Run this once in the Supabase dashboard → SQL editor.
-- Model: each patient is a pseudonymous code (HF-XXXX). The code IS the secret;
-- there are no names or identifiers stored here.

create table if not exists patients (
  id            text primary key,          -- the HF-XXXX code
  baseline      numeric,                   -- "dry weight" in lbs
  entries       jsonb default '[]'::jsonb, -- [{ date, weight }]
  last_analysis jsonb,                     -- { tier, summary, reasoning, action, maxGain, ... }
  last_tier     int,                       -- 1 | 2 | 3
  created_at    date default now(),
  last_updated  date default now()
);

alter table patients enable row level security;

-- Access model (anon key, browser-side): the pseudonymous code is the secret,
-- the same exposure as the previous localStorage model. A patient looks up their
-- own row by code; the physician dashboard (PIN-gated in the UI) lists rows.
-- To harden later, move the dashboard's list query behind a Cloudflare Worker
-- using the service-role key and drop the broad select policy below.
drop policy if exists "read patients"   on patients;
drop policy if exists "insert patients" on patients;
drop policy if exists "update patients" on patients;

create policy "read patients"   on patients for select using (true);
create policy "insert patients"  on patients for insert with check (true);
create policy "update patients"  on patients for update using (true);
create policy "delete patients"  on patients for delete using (true);
