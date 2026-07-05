// ─── Storage Layer ───────────────────────────────────────────────────────────
// One async key/value interface (get/set/list/del) used everywhere in the app.
// Two backends behind it:
//   • localStorage  — per-device, the original behaviour (dev / desktop file).
//   • Supabase      — shared clinic database, enabled when VITE_SUPABASE_* are set.
// Keys follow three patterns:
//   • hf_pt_<CODE>  — one patient record (the real data)
//   • hf_ids        — list of patient codes (derived from the table on Supabase)
//   • hf_config     — per-device clinic settings (PIN, alert email) → always local
import { supabase, SUPABASE_ENABLED } from "./supabaseClient";

const PT_PREFIX = "hf_pt_";

// ─── localStorage backend (unchanged from the original) ──────────────────────
const local = {
  async get(key) {
    try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : null; }
    catch { return null; }
  },
  async set(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); return true; }
    catch { return false; }
  },
  async list(prefix) {
    try { return Object.keys(localStorage).filter(k => k.startsWith(prefix)); }
    catch { return []; }
  },
  async del(key) {
    try { localStorage.removeItem(key); return true; }
    catch { return false; }
  },
};

// ─── Patient <-> DB row mapping ──────────────────────────────────────────────
// App uses camelCase; the Postgres columns are snake_case.
const rowToPatient = (r) => r && {
  id: r.id,
  baseline: r.baseline,
  entries: r.entries || [],
  lastAnalysis: r.last_analysis || null,
  lastTier: r.last_tier ?? null,
  diureticPlan: r.diuretic_plan || null,
  createdAt: r.created_at,
  lastUpdated: r.last_updated,
};

const patientToRow = (d) => ({
  id: d.id,
  baseline: d.baseline === "" || d.baseline == null ? null : Number(d.baseline),
  entries: d.entries || [],
  last_analysis: d.lastAnalysis || null,
  last_tier: d.lastTier ?? null,
  diuretic_plan: d.diureticPlan || null,
  created_at: d.createdAt || null,
  last_updated: d.lastUpdated || null,
});

// ─── Supabase backend ────────────────────────────────────────────────────────
const remote = {
  async get(key) {
    if (key === "hf_ids") {
      const { data, error } = await supabase.from("patients").select("id");
      if (error) { console.error("Supabase list ids failed:", error.message); return []; }
      return data.map(r => r.id);
    }
    if (key.startsWith(PT_PREFIX)) {
      const id = key.slice(PT_PREFIX.length);
      const { data, error } = await supabase.from("patients").select("*").eq("id", id).maybeSingle();
      if (error) { console.error("Supabase get patient failed:", error.message); return null; }
      return rowToPatient(data);
    }
    // hf_config and anything else stays on the device.
    return local.get(key);
  },
  async set(key, val) {
    if (key === "hf_ids") return true; // derived from the table — nothing to store
    if (key.startsWith(PT_PREFIX)) {
      const { error } = await supabase.from("patients").upsert(patientToRow(val));
      if (error) { console.error("Supabase save patient failed:", error.message); return false; }
      return true;
    }
    return local.set(key, val);
  },
  async list(prefix) {
    if (prefix === PT_PREFIX) {
      const ids = await remote.get("hf_ids");
      return ids.map(id => PT_PREFIX + id);
    }
    return local.list(prefix);
  },
  async del(key) {
    if (key.startsWith(PT_PREFIX)) {
      const id = key.slice(PT_PREFIX.length);
      const { error } = await supabase.from("patients").delete().eq("id", id);
      if (error) { console.error("Supabase delete patient failed:", error.message); return false; }
      return true;
    }
    return local.del(key);
  },
};

export const DB = SUPABASE_ENABLED ? remote : local;

// ─── One-time migration: push existing localStorage patients up to Supabase ──
// Runs once per device the first time the app loads with Supabase enabled, so a
// clinic that started on localStorage doesn't lose its patients. Idempotent
// (upsert) and guarded by a flag so it only sweeps once.
export async function migrateLocalToSupabase() {
  if (!SUPABASE_ENABLED) return;
  try {
    if (localStorage.getItem("hf_migrated") === "1") return;
    const keys = Object.keys(localStorage).filter(k => k.startsWith(PT_PREFIX));
    for (const k of keys) {
      const data = JSON.parse(localStorage.getItem(k));
      if (data && data.id) {
        const { error } = await supabase.from("patients").upsert(patientToRow(data));
        if (error) { console.error("Migration upsert failed for", data.id, error.message); return; }
      }
    }
    localStorage.setItem("hf_migrated", "1");
    if (keys.length) console.info(`Migrated ${keys.length} local patient record(s) to Supabase.`);
  } catch (e) {
    console.error("Local→Supabase migration failed:", e);
  }
}
