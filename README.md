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

- Patient data currently lives in the browser's `localStorage` only
  (`hf_pt_{CODE}` keys) — no backend, no names, codes assigned in clinic.
- **Limitation:** localStorage is per-browser/per-device. A patient's history
  exists only on the device where they entered it, and the physician dashboard
  only sees patients who registered in that same browser.
- **Planned fix:** migrate storage to Supabase so data syncs across devices —
  see [SUPABASE_PLAN.md](SUPABASE_PLAN.md). The storage layer is isolated in the
  `DB` object in `src/MonitorPlatform.jsx`, so this is a contained change.

## Source layout

- `src/App.jsx` — router + global language state
- `src/components/Header.jsx` — shared clinic header, EN/ES toggle, 911 strip
- `src/pages/Home.jsx` — landing page
- `src/pages/PrescribeTool.jsx` — diuretic prescribing wizard
- `src/MonitorPlatform.jsx` — patient portal, PIN gate, physician dashboard, storage layer
- `worker/index.js` — Cloudflare Worker: serves `dist/` and proxies `/api/analyze`
- `wrangler.jsonc` — Worker + static-assets deploy config
- `hf-*.jsx` in the root are the original Claude.ai artifact files (kept for reference)
