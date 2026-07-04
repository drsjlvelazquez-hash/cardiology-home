import { createClient } from "@supabase/supabase-js";

// Vite exposes only VITE_-prefixed vars to the browser bundle.
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// When both are present the app uses the shared Supabase database (a patient can
// log from their phone and the physician dashboard sees every patient). When
// they are absent — local dev without keys, or the single-file desktop build —
// the app silently falls back to per-device localStorage (see db.js).
export const SUPABASE_ENABLED = Boolean(url && anonKey);

export const supabase = SUPABASE_ENABLED ? createClient(url, anonKey) : null;
