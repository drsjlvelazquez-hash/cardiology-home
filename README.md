# Heart Failure Clinic — Web Application

A unified web app with two tools for a heart failure clinic:

| Route | Tool | Who uses it |
|-------|------|-------------|
| `#/` | Home / landing page | Everyone |
| `#/patient` | Weight monitor (code-based, pseudonymized) | Patients at home |
| `#/physician` | PIN-gated dashboard (default PIN: 1234) | Providers |
| `#/prescribe` | 3-tier diuretic prescribing wizard + bilingual print handout | Providers in clinic |

Bilingual EN/ES throughout (header toggle for the site; separate handout-language
toggle inside the prescribing tool). Uses hash routing (`#/patient`) so the built
app also works as a standalone desktop file.

## Run locally

```bash
npm install
npm run dev
```

Opens at http://localhost:5173.

## Desktop (no server)

`npm run build` produces a single self-contained `dist/index.html` — copy it
anywhere (e.g. the Desktop as `Heart Failure Clinic.html`) and double-click.
For the AI analysis to work in this mode, put your key in `.env` as
`VITE_ANTHROPIC_API_KEY` **before** building (the key gets baked into the file —
only do this for a private desktop copy, never for a file you share).

## AI weight analysis

The patient monitor's "Analyze" button calls Claude (`claude-sonnet-5`):

- **Deployed on Cloudflare:** the request goes through the Worker
  (`worker/index.js` handles `POST /api/analyze`), so the API key stays
  server-side and is never exposed to visitors. Set `ANTHROPIC_API_KEY` in the
  Cloudflare dashboard.
- **Local dev / desktop file:** falls back to calling the API directly from the
  browser using `VITE_ANTHROPIC_API_KEY` from `.env`.

Without any key configured, everything else works; the analyze button shows a
friendly error.

## Deploy to Cloudflare (Worker + static assets)

Deploys as a Cloudflare **Worker** that serves the built site and handles
`POST /api/analyze` — see `worker/index.js` and `wrangler.jsonc`.

1. Push this folder to a GitHub repo (`.env` is git-ignored).
2. Cloudflare dashboard → **Workers & Pages → Create → Connect to Git**
   → pick the repo.
3. Build command `npm run build`; deploy command `npx wrangler deploy`.
   The `assets` block in `wrangler.jsonc` serves everything in `dist/`.
4. After the first deploy: **Settings → Variables and Secrets** → add
   `ANTHROPIC_API_KEY` (type: Secret) with your Anthropic key → redeploy.
5. Your site is live at `https://<worker>.<subdomain>.workers.dev`
   (custom domain optional).

## Data & privacy

- No names anywhere — each patient is a pseudonymous code (`HF-XXXX`) assigned in
  clinic; the code-to-patient mapping stays on paper in the office.
- **Storage is pluggable** (`src/db.js`):
  - **Supabase** (shared clinic database) is used automatically when
    `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` are set. Patients log from any
    device and the physician dashboard sees everyone.
  - **localStorage** (per-device) is the fallback when those vars are blank —
    used by local dev without keys and the single-file desktop build.
- On the first load after Supabase is enabled, any patients already in that
  device's localStorage are migrated up to the database automatically (one-time,
  idempotent).

### Enabling Supabase

1. Create a free project at [supabase.com](https://supabase.com) (dedicated to
   this app — do not share with other sites).
2. In the SQL editor, run [supabase/schema.sql](supabase/schema.sql) to create
   the `patients` table and its access policies.
3. Copy **Project URL** and **anon public key** from Project Settings → API.
4. Add them to `.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) for local
   dev, and to the Cloudflare dashboard (**Settings → Variables**, plain Variables
   — the anon key is safe to expose) for the deployed site, then redeploy.

See [SUPABASE_PLAN.md](SUPABASE_PLAN.md) for the design and the dashboard-security
options (anon key now, serverless PIN gate later).

## Source layout

- `src/App.jsx` — router + global language state
- `src/components/Header.jsx` — shared clinic header, EN/ES toggle, 911 strip
- `src/pages/Home.jsx` — landing page
- `src/pages/PrescribeTool.jsx` — diuretic prescribing wizard
- `src/MonitorPlatform.jsx` — patient portal, PIN gate, physician dashboard
- `src/db.js` — storage layer (Supabase / localStorage) + one-time migration
- `src/supabaseClient.js` — Supabase client, enabled via `VITE_SUPABASE_*`
- `supabase/schema.sql` — table + RLS policies to run in the Supabase SQL editor
- `worker/index.js` — Cloudflare Worker: serves `dist/` and proxies `/api/analyze`
- `wrangler.jsonc` — Worker + static-assets deploy config
- `hf-*.jsx` in the root are the original Claude.ai artifact files (kept for reference)
