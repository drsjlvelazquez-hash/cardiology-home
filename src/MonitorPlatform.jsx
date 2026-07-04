import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from "recharts";

// Storage goes through the shared DB layer (Supabase when configured, otherwise
// per-device localStorage). See src/db.js.
import { DB } from "./db";

const genId = () => "HF-" + Math.random().toString(36).substr(2, 4).toUpperCase();
const today = () => new Date().toISOString().split("T")[0];
const fmtDate = (d) => { if (!d) return ""; const [y,m,dd] = d.split("-"); return `${m}/${dd}/${y}`; };
const fmtShort = (d) => { if (!d) return ""; const [,m,dd] = d.split("-"); return `${m}/${dd}`; };
const diffLbs = (w, base) => base ? (parseFloat(w) - parseFloat(base)).toFixed(1) : null;

// ─── Tier Config ─────────────────────────────────────────────────────────────
const TC = {
  1: { color:"#1a7a4a", light:"#eaf7f0", border:"#a8dfc0", icon:"●", en:"Tier 1 — Maintenance",   es:"Nivel 1 — Mantenimiento" },
  2: { color:"#b45309", light:"#fffbeb", border:"#fcd34d", icon:"▲", en:"Tier 2 — Weight Alert",   es:"Nivel 2 — Alerta de Peso" },
  3: { color:"#b91c1c", light:"#fff1f2", border:"#fca5a5", icon:"⚠", en:"Tier 3 — Emergency",      es:"Nivel 3 — Emergencia" },
};

// ─── Translations ─────────────────────────────────────────────────────────────
const L = {
  en: {
    newPatient:"First Visit", returning:"I Have a Code", yourCode:"Your Private Code",
    saveCode:"Write this code down and keep it somewhere safe — you will need it every time you return. Do NOT share it online.",
    codePlaceholder:"Enter your code (e.g. HF-A3X9)", findBtn:"Find My Records",
    baseLabel:"Your Baseline Weight (lbs)", basePH:"e.g. 165",
    baseHelp:"Your 'dry weight' — the weight your doctor recorded when you felt well.",
    startBtn:"Start Tracking →", weightLabel:"Weight (lbs)", dateLabel:"Date",
    addBtn:"Add Entry", clearAll:"Clear all", chartTitle:"My Weight History",
    analyzeBtn:"🤖 Analyze & Get Tier Suggestion", analyzing:"Analyzing…",
    assessTitle:"AI Assessment", summaryL:"Summary", reasonL:"Reasoning",
    actionL:"⚡ What to do now", trendImproving:"Trend improving",
    trendStable:"Trend stable", trendWorsening:"Trend worsening",
    maxGainL:"Max gain:", disclaimer:"AI guidance only — always follow your doctor's instructions.",
    emergency:"🚨 Sudden shortness of breath, chest pain, or unable to lie flat → Call 911 immediately.",
    noEntries:"No weight entries yet. Add your first entry above.",
    tip1:"✔ Weigh every morning after urinating", tip2:"✔ Same scale each time", tip3:"✔ Before eating or drinking",
    physicianAccess:"Physician Access", langBtn:"Español", baseline:"Baseline",
    errorAnalyze:"Analysis failed. Please try again.",
    entries:"entries", of:"of",
    privacyTitle:"🔒 Your Privacy is Protected",
    privacyBody:"This system does not collect your name, date of birth, or any personal information. Only your clinic code and weight numbers are stored. Your real identity is kept safely on file at the clinic only.",
    privacyWarn:"Do NOT enter your real name anywhere in this app.",
    newCodeTitle:"You've been assigned a code",
    newCodeInstructions:"Your clinic gave you this code. Use it to log in every time you visit this page.",
    codeLabel:"Your Code",
    enterCodeTitle:"Enter the code your clinic gave you",
  },
  es: {
    newPatient:"Primera Visita", returning:"Tengo un Código", yourCode:"Su Código Privado",
    saveCode:"Anote este código y guárdelo en un lugar seguro — lo necesitará cada vez que regrese. NO lo comparta en línea.",
    codePlaceholder:"Ingrese su código (ej. HF-A3X9)", findBtn:"Buscar Mis Registros",
    baseLabel:"Su Peso Base (libras)", basePH:"ej. 165",
    baseHelp:"Su 'peso seco' — el peso que su médico registró cuando usted se sentía bien.",
    startBtn:"Comenzar →", weightLabel:"Peso (libras)", dateLabel:"Fecha",
    addBtn:"Agregar", clearAll:"Borrar todo", chartTitle:"Mi Historial de Peso",
    analyzeBtn:"🤖 Analizar y Obtener Sugerencia de Nivel", analyzing:"Analizando…",
    assessTitle:"Evaluación IA", summaryL:"Resumen", reasonL:"Razonamiento",
    actionL:"⚡ Qué hacer ahora", trendImproving:"Tendencia mejorando",
    trendStable:"Tendencia estable", trendWorsening:"Tendencia empeorando",
    maxGainL:"Ganancia máx:", disclaimer:"Solo orientación de IA — siga siempre las instrucciones de su médico.",
    emergency:"🚨 Falta de aire repentina, dolor de pecho o no puede acostarse plano → Llame al 911 de inmediato.",
    noEntries:"Aún no hay registros. Agregue su primer registro arriba.",
    tip1:"✔ Pésese cada mañana después de orinar", tip2:"✔ Use la misma báscula", tip3:"✔ Antes de comer o beber",
    physicianAccess:"Acceso Médico", langBtn:"English", baseline:"Base",
    errorAnalyze:"Error al analizar. Por favor intente de nuevo.",
    entries:"registros", of:"de",
    privacyTitle:"🔒 Su Privacidad está Protegida",
    privacyBody:"Este sistema no recopila su nombre, fecha de nacimiento ni ninguna información personal. Solo se almacena su código de clínica y sus números de peso. Su identidad real se mantiene de forma segura solo en la clínica.",
    privacyWarn:"NO ingrese su nombre real en ningún lugar de esta aplicación.",
    newCodeTitle:"Se le ha asignado un código",
    newCodeInstructions:"Su clínica le dio este código. Úselo para iniciar sesión cada vez que visite esta página.",
    codeLabel:"Su Código",
    enterCodeTitle:"Ingrese el código que le dio su clínica",
  },
};

// ─── Small Components ─────────────────────────────────────────────────────────
function TierBadge({ tier, lang = "en", size = "md" }) {
  if (!tier) return null;
  const c = TC[tier];
  const fs = size === "sm" ? 11 : size === "lg" ? 16 : 13;
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:5, background:c.color, color:"white",
      borderRadius:20, padding: size === "sm" ? "2px 9px" : "5px 14px", fontWeight:700, fontSize:fs }}>
      {c.icon} {lang === "es" ? c.es : c.en}
    </span>
  );
}

function DiffBadge({ diff }) {
  if (diff === null) return null;
  const n = parseFloat(diff);
  const [bg, col] = n > 6 ? ["#fff1f2","#b91c1c"] : n > 3 ? ["#fffbeb","#b45309"] : n > 0 ? ["#fefce8","#92400e"] : ["#eaf7f0","#1a7a4a"];
  return <span style={{ background:bg, color:col, borderRadius:6, padding:"1px 7px", fontSize:12, fontWeight:700, border:`1px solid ${col}` }}>
    {n > 0 ? `+${diff}` : diff} lbs
  </span>;
}

const Dot = (props) => {
  const { cx, cy, payload, baseline } = props;
  if (!baseline || cx == null) return null;
  const d = parseFloat(payload.weight) - parseFloat(baseline);
  const col = d > 6 ? "#b91c1c" : d > 3 ? "#b45309" : d > 0 ? "#d97706" : "#1a7a4a";
  return <circle cx={cx} cy={cy} r={5} fill={col} stroke="white" strokeWidth={2} />;
};

function Spinner() {
  return <span style={{ display:"inline-block", width:16, height:16, border:"2px solid #fff", borderTopColor:"transparent", borderRadius:"50%", animation:"spin 0.7s linear infinite" }} />;
}

// ─── Patient Chart ────────────────────────────────────────────────────────────
function WeightChart({ entries, baseline, lang }) {
  if (!entries.length) return null;
  const t = L[lang];
  const data = entries.map(e => ({ date: fmtShort(e.date), weight: parseFloat(e.weight), full: e.date }));
  const ws = entries.map(e => parseFloat(e.weight));
  const bl = baseline ? parseFloat(baseline) : null;
  const minY = Math.min(...ws, bl || Infinity) - 4;
  const maxY = Math.max(...ws, bl || -Infinity) + 4;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top:8, right:8, left:0, bottom:0 }}>
        <defs>
          <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.18} />
            <stop offset="95%" stopColor="#2563eb" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="date" tick={{ fontSize:10, fill:"#64748b" }} />
        <YAxis domain={[minY, maxY]} tick={{ fontSize:10, fill:"#64748b" }} unit="lb" width={48} />
        <Tooltip formatter={(v) => [`${v} lbs`, lang==="es"?"Peso":"Weight"]} contentStyle={{ borderRadius:8, fontSize:12 }} />
        {bl && <ReferenceLine y={bl} stroke="#1a7a4a" strokeWidth={2} strokeDasharray="6 3"
          label={{ value:t.baseline, position:"insideTopRight", fontSize:10, fill:"#1a7a4a" }} />}
        {bl && <ReferenceLine y={bl+3} stroke="#b45309" strokeWidth={1.5} strokeDasharray="4 3"
          label={{ value:"+3 lbs", position:"insideTopRight", fontSize:9, fill:"#b45309" }} />}
        {bl && <ReferenceLine y={bl+6} stroke="#b91c1c" strokeWidth={1.5} strokeDasharray="4 3"
          label={{ value:"+6 lbs", position:"insideTopRight", fontSize:9, fill:"#b91c1c" }} />}
        <Area type="monotone" dataKey="weight" stroke="#2563eb" strokeWidth={2.5} fill="url(#wg)"
          dot={<Dot baseline={baseline} />} activeDot={{ r:7 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ─── AI Analysis ─────────────────────────────────────────────────────────────
async function runAnalysis(entries, baseline, lang) {
  const entriesText = entries.map(e => {
    const d = baseline ? ` (${diffLbs(e.weight, baseline) > 0 ? "+" : ""}${diffLbs(e.weight, baseline)} lbs vs baseline)` : "";
    return `${e.date}: ${e.weight} lbs${d}`;
  }).join("\n");

  const sys = lang === "es"
    ? `Eres un asistente médico en insuficiencia cardíaca. Analiza registros de peso y recomienda nivel de tratamiento diurético.
NIVEL 1: Peso estable, dentro de 3 libras del peso base.
NIVEL 2: Ganó más de 3 libras sobre su peso base.
NIVEL 3: Ganó más de 6-7 libras, o 3-4 libras adicionales a pesar del Nivel 2.
Responde SOLO con JSON válido:
{"tier":1,"summary":"...","reasoning":"...","action":"...","trend":"improving|stable|worsening","maxGain":0}`
    : `You are a heart failure medical assistant. Analyze weight logs and recommend diuretic management tier.
TIER 1: Stable weight, within 3 lbs of baseline.
TIER 2: Gained more than 3 lbs over baseline.
TIER 3: Gained more than 6-7 lbs, or 3-4 additional lbs despite Tier 2 treatment.
Respond ONLY with valid JSON:
{"tier":1,"summary":"...","reasoning":"...","action":"...","trend":"improving|stable|worsening","maxGain":0}`;

  const msg = `Baseline: ${baseline ? baseline + " lbs" : "Not provided"}\nEntries:\n${entriesText}`;

  const parseResult = (data) => {
    const raw = data.content.map(b => b.text || "").join("").replace(/```json|```/g,"").trim();
    return JSON.parse(raw);
  };

  // Deployed on Cloudflare Pages, /api/analyze proxies the call so the API key
  // stays server-side. It doesn't exist under `vite dev` (404) or when the app
  // runs as a desktop file (network error) — those fall through to the direct call.
  let proxyRes = null;
  try {
    proxyRes = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ system: sys, message: msg }),
    });
  } catch { /* no server at all — desktop file */ }
  if (proxyRes) {
    if (proxyRes.ok) return parseResult(await proxyRes.json());
    if (proxyRes.status !== 404 && proxyRes.status !== 405) {
      throw new Error(`API error ${proxyRes.status}`);
    }
  }

  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Missing VITE_ANTHROPIC_API_KEY");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-5",
      max_tokens: 1000,
      thinking: { type: "disabled" },
      output_config: { effort: "low" },
      system: sys,
      messages: [{ role:"user", content:msg }],
    }),
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return parseResult(await res.json());
}

// ─── Patient Portal ───────────────────────────────────────────────────────────
function PatientPortal({ lang }) {
  const t = L[lang];
  const [mode, setMode] = useState("choice"); // choice | new | returning | tracking
  const [patientData, setPatientData] = useState(null); // {id, name, baseline, entries, lastAnalysis}
  const [nameInput, setNameInput] = useState("");
  const [baseInput, setBaseInput] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [weightInput, setWeightInput] = useState("");
  const [dateInput, setDateInput] = useState(today());
  const [analysis, setAnalysis] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiError, setAiError] = useState("");
  const [saving, setSaving] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const assessRef = useRef(null);

  const savePatient = async (data) => {
    setSaving(true);
    await DB.set(`hf_pt_${data.id}`, data);
    // Keep patient list updated
    const list = (await DB.get("hf_ids")) || [];
    if (!list.includes(data.id)) {
      list.push(data.id);
      await DB.set("hf_ids", list);
    }
    setSaving(false);
  };

  const createPatient = async () => {
    const id = genId();
    const data = { id, baseline: baseInput, entries: [], lastAnalysis: null, createdAt: today(), lastUpdated: today() };
    await savePatient(data);
    setPatientData(data);
    setMode("tracking");
  };

  const findPatient = async () => {
    setNotFound(false);
    const code = codeInput.trim().toUpperCase();
    const data = await DB.get(`hf_pt_${code}`);
    if (data) { setPatientData(data); setAnalysis(data.lastAnalysis || null); setMode("tracking"); }
    else setNotFound(true);
  };

  const addEntry = async () => {
    if (!weightInput || isNaN(parseFloat(weightInput))) return;
    if (patientData.entries.length >= 10) return;
    const newEntry = { date: dateInput, weight: parseFloat(weightInput).toFixed(1) };
    const sorted = [...patientData.entries, newEntry].sort((a,b) => new Date(a.date) - new Date(b.date));
    const updated = { ...patientData, entries: sorted, lastUpdated: today() };
    setPatientData(updated);
    setWeightInput("");
    setAnalysis(null);
    await savePatient(updated);
  };

  const removeEntry = async (i) => {
    const entries = patientData.entries.filter((_,idx) => idx !== i);
    const updated = { ...patientData, entries, lastUpdated: today() };
    setPatientData(updated);
    setAnalysis(null);
    await savePatient(updated);
  };

  const analyze = async () => {
    if (!patientData.entries.length) return;
    setLoadingAI(true); setAiError(""); setAnalysis(null);
    try {
      const result = await runAnalysis(patientData.entries, patientData.baseline, lang);
      setAnalysis(result);
      const updated = { ...patientData, lastAnalysis: result, lastTier: result.tier, lastUpdated: today() };
      setPatientData(updated);
      await savePatient(updated);
      setTimeout(() => assessRef.current?.scrollIntoView({ behavior:"smooth", block:"start" }), 100);
    } catch { setAiError(t.errorAnalyze); }
    setLoadingAI(false);
  };

  // ── Choice Screen ──
  if (mode === "choice") return (
    <div style={ps.centerWrap}>
      <div style={ps.choiceCard}>
        <div style={ps.welcomeIcon}>⚖️</div>
        <div style={ps.welcomeTitle}>{lang === "es" ? "Bienvenido" : "Welcome"}</div>
        <div style={ps.welcomeSub}>{lang === "es" ? "¿Es usted un paciente nuevo o ya tiene un código?" : "Are you a new patient or do you have a code?"}</div>
        <button style={ps.choiceBtn} onClick={() => setMode("new")}>✦ {t.newPatient}</button>
        <button style={{ ...ps.choiceBtn, background:"white", color:"#1e3a8a", border:"2px solid #1e3a8a" }}
          onClick={() => setMode("returning")}>↩ {t.returning}</button>
      </div>
    </div>
  );

  // ── New Patient Form ──
  if (mode === "new") return (
    <div style={ps.centerWrap}>
      <div style={ps.formCard}>
        <button style={ps.backBtn} onClick={() => setMode("choice")}>← {lang==="es"?"Atrás":"Back"}</button>
        <div style={ps.formTitle}>{t.newPatient}</div>

        {/* Privacy notice */}
        <div style={ps.privacyBox}>
          <div style={ps.privacyTitle}>{t.privacyTitle}</div>
          <div style={ps.privacyBody}>{t.privacyBody}</div>
          <div style={ps.privacyWarn}>⚠ {t.privacyWarn}</div>
        </div>

        <div style={{ marginTop:16 }}>
          <label style={ps.fieldLabel}>{t.baseLabel}</label>
          <input type="number" style={ps.input} placeholder={t.basePH} value={baseInput} onChange={e => setBaseInput(e.target.value)} />
          <div style={ps.helpText}>{t.baseHelp}</div>
        </div>
        <button style={{ ...ps.choiceBtn, marginTop:20 }} onClick={createPatient}>{t.startBtn}</button>
      </div>
    </div>
  );

  // ── Returning Patient ──
  if (mode === "returning") return (
    <div style={ps.centerWrap}>
      <div style={ps.formCard}>
        <button style={ps.backBtn} onClick={() => setMode("choice")}>← {lang==="es"?"Atrás":"Back"}</button>
        <div style={ps.formTitle}>{t.returning}</div>
        <div style={ps.privacyBox}>
          <div style={ps.privacyTitle}>{t.privacyTitle}</div>
          <div style={ps.privacyBody}>{t.privacyBody}</div>
          <div style={ps.privacyWarn}>⚠ {t.privacyWarn}</div>
        </div>
        <div style={{ marginTop:16 }}>
          <label style={ps.fieldLabel}>{t.enterCodeTitle}</label>
          <input style={{ ...ps.input, fontFamily:"monospace", fontSize:18, letterSpacing:3, textTransform:"uppercase" }}
            placeholder={t.codePlaceholder} value={codeInput}
            onChange={e => { setCodeInput(e.target.value); setNotFound(false); }}
            onKeyDown={e => e.key === "Enter" && findPatient()} />
        </div>
        {notFound && <div style={ps.errorMsg}>{lang==="es" ? "Código no encontrado. Verifique e intente de nuevo." : "Code not found. Please check your card and try again."}</div>}
        <button style={{ ...ps.choiceBtn, marginTop:16, opacity: codeInput.trim() ? 1 : 0.4 }}
          disabled={!codeInput.trim()} onClick={findPatient}>{t.findBtn}</button>
      </div>
    </div>
  );

  // ── Tracking View ──
  const entries = patientData?.entries || [];
  const baseline = patientData?.baseline;
  return (
    <div style={ps.trackWrap}>
      {/* Patient Header */}
      <div style={ps.patientHeader}>
        <div>
          <div style={ps.patientMeta}>{lang==="es" ? "Código:" : "Your Code:"}</div>
          <div style={ps.patientCodeDisplay}>{patientData.id}</div>
          {baseline && <div style={ps.patientMeta}>{lang==="es"?"Peso base:":"Baseline:"} <strong>{baseline} lbs</strong></div>}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
          {patientData.lastTier && <TierBadge tier={patientData.lastTier} lang={lang} size="sm" />}
          {saving && <span style={{ fontSize:11, color:"#64748b" }}>💾 {lang==="es"?"Guardando…":"Saving…"}</span>}
        </div>
      </div>

      {/* Code save reminder — always visible */}
      <div style={ps.codeBannerWrap}>
        <div style={ps.codeBanner}>
          <div style={{ fontSize:12, fontWeight:700, color:"#92400e", marginBottom:6, textTransform:"uppercase", letterSpacing:0.5 }}>
            📋 {t.newCodeTitle}
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
            <div style={ps.codeBox}>{patientData.id}</div>
            <div style={{ fontSize:12.5, color:"#92400e", flex:1 }}>{t.saveCode}</div>
          </div>
          <div style={{ marginTop:8, fontSize:11.5, color:"#b45309", fontWeight:600 }}>🔒 {t.privacyWarn}</div>
        </div>
      </div>

      <div style={ps.trackGrid}>
        {/* Left: Input + Table */}
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          {/* Add entry */}
          <div style={ps.card}>
            <div style={ps.cardRow}>
              <div style={ps.cardTitle}>{t.addBtn}</div>
              <span style={ps.countBadge}>{entries.length} {t.of} 10</span>
            </div>
            <div style={{ display:"flex", gap:8, marginTop:10, flexWrap:"wrap" }}>
              <div style={{ flex:"1 1 100px" }}>
                <label style={ps.fieldLabel}>{t.weightLabel}</label>
                <input type="number" step="0.1" style={ps.input} placeholder="165.0"
                  value={weightInput} onChange={e => setWeightInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addEntry()} />
              </div>
              <div style={{ flex:"1 1 130px" }}>
                <label style={ps.fieldLabel}>{t.dateLabel}</label>
                <input type="date" style={ps.input} value={dateInput} onChange={e => setDateInput(e.target.value)} />
              </div>
            </div>
            <button style={{ ...ps.addBtn, opacity: entries.length >= 10 || !weightInput ? 0.45 : 1 }}
              disabled={entries.length >= 10 || !weightInput} onClick={addEntry}>
              + {t.addBtn}
            </button>
          </div>

          {/* Table */}
          {entries.length > 0 && (
            <div style={ps.card}>
              <div style={ps.cardRow}>
                <div style={ps.cardTitle}>{t.chartTitle}</div>
                <button style={ps.clearBtn} onClick={async () => {
                  const updated = { ...patientData, entries:[], lastAnalysis:null, lastTier:null };
                  setPatientData(updated); setAnalysis(null); await savePatient(updated);
                }}>{t.clearAll}</button>
              </div>
              <table style={ps.table}>
                <thead>
                  <tr>{["#", t.dateLabel, t.weightLabel, ...(baseline ? ["vs Base"] : []), ""].map(h => (
                    <th key={h} style={ps.th}>{h}</th>))}</tr>
                </thead>
                <tbody>
                  {entries.map((e, i) => (
                    <tr key={i} style={{ background: i%2===0 ? "#f8faff" : "white" }}>
                      <td style={ps.td}>{i+1}</td>
                      <td style={ps.td}>{fmtDate(e.date)}</td>
                      <td style={{ ...ps.td, fontWeight:700 }}>{e.weight} lbs</td>
                      {baseline && <td style={ps.td}><DiffBadge diff={diffLbs(e.weight, baseline)} /></td>}
                      <td style={ps.td}><button style={ps.removeBtn} onClick={() => removeEntry(i)}>✕</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right: Chart + AI */}
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          {entries.length > 0 ? (
            <div style={ps.card}>
              <div style={ps.cardTitle}>{t.chartTitle}</div>
              <WeightChart entries={entries} baseline={baseline} lang={lang} />
              {baseline && (
                <div style={{ display:"flex", gap:12, marginTop:8, fontSize:11, flexWrap:"wrap" }}>
                  {[["#1a7a4a", t.baseline], ["#b45309", "+3 lbs"], ["#b91c1c", "+6 lbs"]].map(([c,l]) => (
                    <span key={l} style={{ display:"flex", alignItems:"center", gap:4, color:"#475569" }}>
                      <span style={{ width:10, height:10, borderRadius:"50%", background:c, display:"inline-block" }}/>{l}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div style={{ ...ps.card, textAlign:"center", color:"#94a3b8", padding:"40px 20px" }}>
              <div style={{ fontSize:36, marginBottom:10 }}>📊</div>
              <div style={{ fontSize:13 }}>{t.noEntries}</div>
            </div>
          )}

          {entries.length > 0 && (
            <button style={{ ...ps.analyzeBtn, opacity: loadingAI ? 0.7 : 1 }}
              disabled={loadingAI} onClick={analyze}>
              {loadingAI ? <><Spinner /> &nbsp;{t.analyzing}</> : t.analyzeBtn}
            </button>
          )}

          {aiError && <div style={ps.errorMsg}>{aiError}</div>}

          {/* Assessment */}
          {analysis && (
            <div ref={assessRef} style={{ ...ps.card, border:`2px solid ${TC[analysis.tier]?.color}`, background:TC[analysis.tier]?.light }}>
              <div style={{ marginBottom:12 }}>
                <div style={ps.assessLabel}>{t.assessTitle}</div>
                <TierBadge tier={analysis.tier} lang={lang} size="lg" />
              </div>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:12 }}>
                <span style={{ ...ps.trendPill, background: analysis.trend==="improving" ? "#eaf7f0" : analysis.trend==="worsening" ? "#fff1f2" : "#f1f5f9",
                  color: analysis.trend==="improving" ? "#1a7a4a" : analysis.trend==="worsening" ? "#b91c1c" : "#475569" }}>
                  {analysis.trend==="improving" ? "📉 " : analysis.trend==="worsening" ? "📈 " : "➡ "}
                  {t[`trend${analysis.trend.charAt(0).toUpperCase()+analysis.trend.slice(1)}`]}
                </span>
                {analysis.maxGain > 0 && <span style={ps.gainPill}>{t.maxGainL} +{analysis.maxGain} lbs</span>}
              </div>
              {[["summaryL", analysis.summary], ["reasonL", analysis.reasoning]].map(([k,v]) => (
                <div key={k} style={{ marginBottom:10 }}>
                  <div style={ps.assessSub}>{t[k]}</div>
                  <div style={ps.assessText}>{v}</div>
                </div>
              ))}
              <div style={{ background:TC[analysis.tier]?.color + "18", border:`1px solid ${TC[analysis.tier]?.border}`,
                borderRadius:8, padding:"9px 13px", marginBottom:10 }}>
                <div style={ps.assessSub}>{t.actionL}</div>
                <div style={{ ...ps.assessText, fontWeight:700 }}>{analysis.action}</div>
              </div>
              <div style={ps.disclaimer}>{t.disclaimer}</div>
            </div>
          )}

          <div style={ps.emergencyStrip}>{t.emergency}</div>
        </div>
      </div>
    </div>
  );
}

// ─── PIN Change Section (used inside Settings modal) ─────────────────────────
function PINChangeSection({ config, setConfig }) {
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [status, setStatus] = useState(""); // "" | "success" | "wrong" | "mismatch" | "short"

  const handleChange = () => {
    const storedPin = config.pin || "1234";
    if (currentPin !== storedPin) { setStatus("wrong"); return; }
    if (newPin.length < 4) { setStatus("short"); return; }
    if (newPin !== confirmPin) { setStatus("mismatch"); return; }
    setConfig(c => ({ ...c, pin: newPin }));
    setCurrentPin(""); setNewPin(""); setConfirmPin("");
    setStatus("success");
    setTimeout(() => setStatus(""), 3000);
  };

  const msgs = {
    wrong:    { color:"#b91c1c", bg:"#fff1f2", border:"#fca5a5", text:"Current PIN is incorrect." },
    mismatch: { color:"#b45309", bg:"#fffbeb", border:"#fcd34d", text:"New PINs do not match." },
    short:    { color:"#b45309", bg:"#fffbeb", border:"#fcd34d", text:"PIN must be at least 4 digits." },
    success:  { color:"#1a7a4a", bg:"#eaf7f0", border:"#a8dfc0", text:"✓ PIN updated successfully." },
  };

  return (
    <div style={{ background:"#f8fafc", border:"1.5px solid #e2e8f0", borderRadius:10, padding:"14px 16px", marginBottom:6 }}>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:10 }}>
        {[
          ["Current PIN", currentPin, setCurrentPin],
          ["New PIN",     newPin,     setNewPin],
          ["Confirm PIN", confirmPin, setConfirmPin],
        ].map(([label, val, setter]) => (
          <div key={label}>
            <div style={{ fontSize:10, fontWeight:700, color:"#475569", letterSpacing:0.6, textTransform:"uppercase", marginBottom:4 }}>{label}</div>
            <input
              type="password"
              maxLength={8}
              style={{ ...ps.input, textAlign:"center", letterSpacing:6, fontSize:18 }}
              placeholder="••••"
              value={val}
              onChange={e => { setter(e.target.value.replace(/\D/g,"")); setStatus(""); }}
            />
          </div>
        ))}
      </div>
      {status && (
        <div style={{ background: msgs[status].bg, border:`1px solid ${msgs[status].border}`, borderRadius:7,
          padding:"6px 12px", fontSize:12.5, color: msgs[status].color, marginBottom:10 }}>
          {msgs[status].text}
        </div>
      )}
      <button
        style={{ background:"#1e3a8a", color:"white", border:"none", borderRadius:8, padding:"8px 18px",
          fontSize:13, fontWeight:700, cursor:"pointer", opacity: currentPin && newPin && confirmPin ? 1 : 0.4 }}
        disabled={!currentPin || !newPin || !confirmPin}
        onClick={handleChange}>
        Update PIN
      </button>
      <div style={{ fontSize:11, color:"#94a3b8", marginTop:8 }}>Current PIN is required to change. Default PIN is <strong>1234</strong>.</div>
    </div>
  );
}

// ─── Physician Dashboard ──────────────────────────────────────────────────────
function PhysicianDashboard({ onBack }) {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState("all"); // all | 1 | 2 | 3
  const [showSettings, setShowSettings] = useState(false);
  const [config, setConfig] = useState({ physicianEmail:"", emailjsService:"", emailjsTemplate:"", emailjsKey:"" });
  const [emailStatus, setEmailStatus] = useState({});

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    const ids = (await DB.get("hf_ids")) || [];
    const cfg = (await DB.get("hf_config")) || {};
    setConfig(c => ({ ...c, ...cfg }));
    const pts = (await Promise.all(ids.map(id => DB.get(`hf_pt_${id}`)))).filter(Boolean);
    pts.sort((a,b) => (b.lastTier||0) - (a.lastTier||0) || new Date(b.lastUpdated) - new Date(a.lastUpdated));
    setPatients(pts);
    setLoading(false);
  };

  const saveConfig = async (cfg) => {
    setConfig(cfg);
    await DB.set("hf_config", cfg);
  };

  const sendEmail = async (pt) => {
    const subj = `HF Clinic Alert — Code ${pt.id} has reached ${pt.lastTier === 3 ? "Tier 3 (EMERGENCY)" : "Tier 2 (Weight Alert)"}`;
    const body = `Patient Code: ${pt.id}\nTier: ${pt.lastTier}\nLast Updated: ${pt.lastUpdated}\nBaseline: ${pt.baseline} lbs\n\nLast Analysis:\n${pt.lastAnalysis?.summary || "N/A"}\n\nAction Needed: ${pt.lastAnalysis?.action || "N/A"}\n\nMax Weight Gain: +${pt.lastAnalysis?.maxGain || "?"} lbs\n\n(Look up this code in your office records to identify the patient.)`;

    if (config.emailjsService && config.emailjsTemplate && config.emailjsKey) {
      try {
        setEmailStatus(s => ({ ...s, [pt.id]: "sending" }));
        await fetch("https://api.emailjs.com/api/v1.0/email/send", {
          method:"POST",
          headers:{ "Content-Type":"application/json" },
          body: JSON.stringify({
            service_id: config.emailjsService,
            template_id: config.emailjsTemplate,
            user_id: config.emailjsKey,
            template_params: {
              to_email: config.physicianEmail,
              patient_code: pt.id,
              tier: pt.lastTier,
              weight_gain: pt.lastAnalysis?.maxGain || "?",
              last_weight: pt.entries?.slice(-1)[0]?.weight || "?",
              summary: pt.lastAnalysis?.summary || "",
              action: pt.lastAnalysis?.action || "",
              last_updated: pt.lastUpdated,
              note: "Look up this code in your office records to identify the patient.",
            },
          }),
        });
        setEmailStatus(s => ({ ...s, [pt.id]: "sent" }));
        setTimeout(() => setEmailStatus(s => ({ ...s, [pt.id]: null })), 4000);
      } catch { setEmailStatus(s => ({ ...s, [pt.id]: "error" })); }
    } else {
      window.location.href = `mailto:${config.physicianEmail || ""}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(body)}`;
    }
  };

  const deletePatient = async (id) => {
    if (!window.confirm("Delete this patient's data permanently?")) return;
    await DB.del(`hf_pt_${id}`);
    const ids = ((await DB.get("hf_ids")) || []).filter(i => i !== id);
    await DB.set("hf_ids", ids);
    setPatients(p => p.filter(pt => pt.id !== id));
    if (selected?.id === id) setSelected(null);
  };

  const filtered = filter === "all" ? patients : patients.filter(p => p.lastTier === Number(filter));
  const counts = { total: patients.length, t1: patients.filter(p=>p.lastTier===1).length, t2: patients.filter(p=>p.lastTier===2).length, t3: patients.filter(p=>p.lastTier===3).length, none: patients.filter(p=>!p.lastTier).length };
  const alerts = patients.filter(p => p.lastTier >= 2);

  return (
    <div style={md.wrap}>
      {/* Dashboard Header */}
      <div style={md.dashHeader}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <button style={md.backBtn} onClick={onBack}>← Exit</button>
          <div>
            <div style={md.dashTitle}>Physician Dashboard</div>
            <div style={md.dashSub}>{counts.total} patients monitored · Last refresh: just now</div>
          </div>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button style={md.iconBtn} onClick={loadAll} title="Refresh">🔄 Refresh</button>
          <button style={md.iconBtn} onClick={() => setShowSettings(true)} title="Settings">⚙️ Settings</button>
        </div>
      </div>

      {/* Stats Bar */}
      <div style={md.statsBar}>
        {[["Total Patients", counts.total, "#1e3a8a", "#eff6ff"],
          ["Tier 1 — Stable", counts.t1, "#1a7a4a", "#eaf7f0"],
          ["Tier 2 — Alert", counts.t2, "#b45309", "#fffbeb"],
          ["Tier 3 — Emergency", counts.t3, "#b91c1c", "#fff1f2"],
          ["Not Yet Analyzed", counts.none, "#64748b", "#f1f5f9"]
        ].map(([label, count, color, bg]) => (
          <div key={label} style={{ ...md.statCard, background:bg, borderColor:color + "40" }} onClick={() => setFilter(label.includes("1") ? "1" : label.includes("2") ? "2" : label.includes("3") ? "3" : "all")}>
            <div style={{ fontSize:26, fontWeight:800, color }}>{count}</div>
            <div style={{ fontSize:11, color, fontWeight:600, marginTop:2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Alerts Banner */}
      {alerts.length > 0 && (
        <div style={md.alertBanner}>
          <div style={md.alertTitle}>🚨 Patients Requiring Attention ({alerts.length})</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginTop:8 }}>
            {alerts.map(pt => (
              <div key={pt.id} style={{ ...md.alertChip, borderColor: TC[pt.lastTier].color, background: TC[pt.lastTier].light }}>
                <span style={{ fontWeight:700, color: TC[pt.lastTier].color }}>{TC[pt.lastTier].icon} {pt.id}</span>
                <span style={{ fontSize:11, color:"#64748b" }}> · Updated {pt.lastUpdated}</span>
                <button style={{ ...md.emailBtn, background: TC[pt.lastTier].color }}
                  onClick={() => sendEmail(pt)}>
                  {emailStatus[pt.id] === "sending" ? "⏳" : emailStatus[pt.id] === "sent" ? "✓ Sent" : emailStatus[pt.id] === "error" ? "✗ Failed" : "📧 Alert"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter Row */}
      <div style={md.filterRow}>
        {[["all","All Patients"],["1","Tier 1"],["2","Tier 2"],["3","Tier 3"]].map(([v,l]) => (
          <button key={v} style={{ ...md.filterBtn, ...(filter===v ? md.filterBtnActive : {}) }}
            onClick={() => setFilter(v)}>{l}</button>
        ))}
        <span style={{ marginLeft:"auto", fontSize:12, color:"#94a3b8" }}>{filtered.length} shown</span>
      </div>

      {loading ? (
        <div style={md.emptyState}>Loading patient data…</div>
      ) : filtered.length === 0 ? (
        <div style={md.emptyState}>No patients found{filter !== "all" ? " for this filter" : ". Patients will appear here after they register."}.</div>
      ) : (
        <div style={md.patientGrid}>
          {filtered.map(pt => (
            <div key={pt.id} style={{ ...md.ptCard, ...(selected?.id === pt.id ? { border:`2px solid ${TC[pt.lastTier||1]?.color || "#2563eb"}` } : {}) }}>
              <div style={md.ptCardTop} onClick={() => setSelected(selected?.id === pt.id ? null : pt)}>
                <div>
                  <div style={md.ptName}>Code: {pt.id}</div>
                  <div style={md.ptMeta}>Registered {fmtDate(pt.createdAt)} · Updated {fmtDate(pt.lastUpdated)}</div>
                  <div style={{ marginTop:6 }}>
                    {pt.lastTier ? <TierBadge tier={pt.lastTier} size="sm" /> : <span style={md.noTierBadge}>Not analyzed yet</span>}
                    {pt.baseline && <span style={md.baseChip}>Base: {pt.baseline} lbs</span>}
                    {pt.entries?.length > 0 && pt.lastAnalysis?.maxGain > 0 && (
                      <span style={md.gainChip}>+{pt.lastAnalysis.maxGain} lbs gain</span>
                    )}
                  </div>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:6, alignItems:"flex-end" }}>
                  <span style={md.entriesChip}>{pt.entries?.length || 0} entries</span>
                  {pt.entries?.length > 0 && (
                    <span style={{ fontSize:14, fontWeight:700, color:"#1e293b" }}>
                      {pt.entries.slice(-1)[0]?.weight} lbs
                    </span>
                  )}
                  <span style={{ fontSize:11, color:"#94a3b8" }}>{selected?.id === pt.id ? "▲ hide" : "▼ expand"}</span>
                </div>
              </div>

              {/* Expanded Detail */}
              {selected?.id === pt.id && (
                <div style={md.ptDetail}>
                  <div style={md.ptDetailGrid}>
                    <div>
                      {pt.entries?.length > 0 && <WeightChart entries={pt.entries} baseline={pt.baseline} lang="en" />}
                      {pt.entries?.length > 0 && (
                        <table style={{ ...ps.table, marginTop:10 }}>
                          <thead><tr><th style={ps.th}>#</th><th style={ps.th}>Date</th><th style={ps.th}>Weight</th>{pt.baseline && <th style={ps.th}>vs Base</th>}</tr></thead>
                          <tbody>{pt.entries.map((e,i) => (
                            <tr key={i} style={{ background: i%2===0?"#f8faff":"white" }}>
                              <td style={ps.td}>{i+1}</td><td style={ps.td}>{fmtDate(e.date)}</td>
                              <td style={{ ...ps.td, fontWeight:700 }}>{e.weight} lbs</td>
                              {pt.baseline && <td style={ps.td}><DiffBadge diff={diffLbs(e.weight, pt.baseline)} /></td>}
                            </tr>
                          ))}</tbody>
                        </table>
                      )}
                    </div>
                    <div>
                      {pt.lastAnalysis && (
                        <div style={{ background: TC[pt.lastTier]?.light, border:`1.5px solid ${TC[pt.lastTier]?.border}`, borderRadius:10, padding:"14px 16px" }}>
                          <div style={{ fontWeight:700, fontSize:13, color:"#374151", marginBottom:8 }}>Last AI Assessment</div>
                          <TierBadge tier={pt.lastTier} size="sm" />
                          <div style={{ marginTop:10, fontSize:12.5, color:"#374151", lineHeight:1.6 }}>
                            <strong>Summary:</strong> {pt.lastAnalysis.summary}
                          </div>
                          <div style={{ marginTop:8, fontSize:12.5, color:"#374151", lineHeight:1.6 }}>
                            <strong>Action:</strong> {pt.lastAnalysis.action}
                          </div>
                          {pt.lastAnalysis.maxGain > 0 && (
                            <div style={{ marginTop:8, fontSize:12, color:"#64748b" }}>Max gain: +{pt.lastAnalysis.maxGain} lbs</div>
                          )}
                        </div>
                      )}
                      <div style={{ display:"flex", gap:8, marginTop:12, flexWrap:"wrap" }}>
                        {pt.lastTier >= 2 && (
                          <button style={{ ...md.emailBtnLg, background: TC[pt.lastTier].color }}
                            onClick={() => sendEmail(pt)}>
                            {emailStatus[pt.id] === "sending" ? "⏳ Sending…" : emailStatus[pt.id] === "sent" ? "✓ Alert Sent" : "📧 Send Alert Email"}
                          </button>
                        )}
                        <button style={md.deleteBtnLg} onClick={() => deletePatient(pt.id)}>🗑 Delete Patient</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div style={md.modalOverlay} onClick={() => setShowSettings(false)}>
          <div style={md.modalBox} onClick={e => e.stopPropagation()}>
            <div style={md.modalTitle}>⚙️ Dashboard Settings</div>

            {/* PIN Section */}
            <div style={md.settingDivider}>
              <div style={md.settingDividerLabel}>🔒 Dashboard PIN</div>
            </div>
            <PINChangeSection config={config} setConfig={setConfig} />

            {/* Email Section */}
            <div style={md.settingDivider}>
              <div style={md.settingDividerLabel}>📬 Alert Email</div>
            </div>
            <div style={md.settingSection}>
              <div style={md.settingLabel}>Physician Email (for alerts)</div>
              <input style={ps.input} type="email" placeholder="doctor@clinic.com"
                value={config.physicianEmail} onChange={e => setConfig(c => ({...c, physicianEmail:e.target.value}))} />
            </div>
            <div style={md.settingDivider}>
              <div style={md.settingDividerLabel}>📧 EmailJS Configuration (optional — for automatic email alerts)</div>
              <div style={md.settingHelp}>
                Set up a free account at <strong>emailjs.com</strong> → create a service (Gmail/Outlook) → create a template using variables: <code>patient_code, tier, weight_gain, summary, action</code> → paste your IDs below.
              </div>
            </div>
            {[["EmailJS Service ID", "emailjsService", "service_xxxxxxx"],
              ["EmailJS Template ID", "emailjsTemplate", "template_xxxxxxx"],
              ["EmailJS Public Key", "emailjsKey", "xxxxxxxxxxxxxxxxxxx"]
            ].map(([label, key, ph]) => (
              <div key={key} style={md.settingSection}>
                <div style={md.settingLabel}>{label}</div>
                <input style={ps.input} placeholder={ph} value={config[key]}
                  onChange={e => setConfig(c => ({...c, [key]:e.target.value}))} />
              </div>
            ))}
            <div style={md.settingHelp}>
              If EmailJS is not configured, clicking "Send Alert Email" will open your email client (mailto) with a pre-filled message instead.
            </div>
            <div style={{ display:"flex", gap:10, marginTop:20 }}>
              <button style={md.saveCfgBtn} onClick={async () => { await saveConfig(config); setShowSettings(false); }}>Save Settings</button>
              <button style={md.cancelBtn} onClick={() => setShowSettings(false)}>Cancel</button>
            </div>
            <div style={{ marginTop:16, padding:"10px 14px", background:"#fff7ed", border:"1px solid #fed7aa", borderRadius:8, fontSize:11.5, color:"#92400e", lineHeight:1.5 }}>
              ⚠ <strong>Note:</strong> This tool is for demonstration purposes only. It is not HIPAA-compliant. Do not store real protected health information. For clinical use, consult your IT/compliance team for an approved platform.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Physician PIN Gate ───────────────────────────────────────────────────────
function PINGate({ onSuccess, onBack }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [storedPin, setStoredPin] = useState(null);

  useEffect(() => {
    DB.get("hf_config").then(cfg => setStoredPin(cfg?.pin || "1234"));
  }, []);

  const check = () => {
    const correct = storedPin || "1234";
    if (pin === correct) onSuccess();
    else { setError("Incorrect PIN. Default is 1234."); setPin(""); }
  };

  return (
    <div style={ps.centerWrap}>
      <div style={ps.formCard}>
        <button style={ps.backBtn} onClick={onBack}>← Back to Patient Portal</button>
        <div style={{ fontSize:32, textAlign:"center", marginBottom:8 }}>🔒</div>
        <div style={ps.formTitle}>Physician Access</div>
        <div style={{ fontSize:13, color:"#6b7280", marginBottom:16, textAlign:"center" }}>Enter your dashboard PIN to continue.</div>
        <label style={ps.fieldLabel}>PIN</label>
        <input type="password" style={{ ...ps.input, letterSpacing:8, fontSize:20, textAlign:"center" }}
          placeholder="••••" maxLength={6} value={pin}
          onChange={e => { setPin(e.target.value); setError(""); }}
          onKeyDown={e => e.key === "Enter" && check()} />
        {error && <div style={{ color:"#b91c1c", fontSize:12.5, marginTop:6 }}>{error}</div>}
        <button style={{ ...ps.choiceBtn, marginTop:16, opacity: pin ? 1 : 0.4 }}
          disabled={!pin} onClick={check}>Enter Dashboard →</button>
        <div style={{ fontSize:11, color:"#94a3b8", textAlign:"center", marginTop:10 }}>Default PIN: 1234 (change in Settings)</div>
      </div>
    </div>
  );
}

// ─── Route Pages ──────────────────────────────────────────────────────────────
const pageBg = {
  minHeight: "calc(100vh - 110px)",
  background: "linear-gradient(160deg,#e8f0fe 0%,#f0f6ff 60%,#fef9ee 100%)",
  fontFamily: "'Nunito',sans-serif",
};

export function PatientPage({ lang }) {
  const t = L[lang];
  const navigate = useNavigate();

  return (
    <div style={pageBg}>
      {/* Sub-header: title, physician access, weighing tips */}
      <div style={appS.header}>
        <div style={appS.headerInner}>
          <div>
            <div style={appS.title}>{lang==="es" ? "Monitor de Peso — Insuficiencia Cardíaca" : "Heart Failure Weight Monitor"}</div>
            <div style={appS.sub}>{lang==="es" ? "Registre su peso · Reciba orientación" : "Track your weight · Get guidance · Stay connected with your care team"}</div>
          </div>
          <button style={appS.secondaryBtn} onClick={() => navigate("/physician")}>
            🩺 {t.physicianAccess}
          </button>
        </div>
        <div style={appS.tips}>
          <span>{t.tip1}</span><span>{t.tip2}</span><span>{t.tip3}</span>
        </div>
      </div>

      <PatientPortal lang={lang} />
    </div>
  );
}

export function PhysicianPage() {
  const [unlocked, setUnlocked] = useState(false);
  const navigate = useNavigate();

  return (
    <div style={pageBg}>
      {unlocked
        ? <PhysicianDashboard onBack={() => navigate("/")} />
        : <PINGate onSuccess={() => setUnlocked(true)} onBack={() => navigate("/patient")} />}
    </div>
  );
}

// ─── Shared Styles ────────────────────────────────────────────────────────────
const appS = {
  header: { background:"linear-gradient(135deg,#1e3a8a 0%,#1d4ed8 100%)", color:"white", padding:"0 20px", boxShadow:"0 2px 16px rgba(30,58,138,0.3)" },
  headerInner: { maxWidth:1100, margin:"0 auto", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 0", flexWrap:"wrap", gap:12 },
  title: { fontFamily:"'Lora',serif", fontSize:17, fontWeight:700 },
  sub: { fontSize:11, color:"#93c5fd", marginTop:2 },
  tips: { maxWidth:1100, margin:"0 auto", display:"flex", gap:24, flexWrap:"wrap", borderTop:"1px solid rgba(255,255,255,0.1)", padding:"8px 0 10px", fontSize:12, color:"#bfdbfe", fontWeight:600 },
  langBtn: { background:"rgba(255,255,255,0.15)", border:"1.5px solid rgba(255,255,255,0.3)", color:"white", borderRadius:8, padding:"6px 14px", fontSize:12, fontWeight:700 },
  secondaryBtn: { background:"rgba(255,255,255,0.1)", border:"1.5px solid rgba(255,255,255,0.25)", color:"white", borderRadius:8, padding:"6px 14px", fontSize:12, fontWeight:600 },
};

const ps = {
  centerWrap: { display:"flex", justifyContent:"center", alignItems:"flex-start", padding:"40px 20px 60px" },
  choiceCard: { background:"white", borderRadius:16, padding:"40px 32px", boxShadow:"0 4px 24px rgba(0,0,0,0.08)", maxWidth:380, width:"100%", textAlign:"center" },
  welcomeIcon: { fontSize:44, marginBottom:12 },
  welcomeTitle: { fontFamily:"'Lora',serif", fontSize:22, fontWeight:700, color:"#1e3a8a", marginBottom:6 },
  welcomeSub: { fontSize:13.5, color:"#64748b", marginBottom:24 },
  choiceBtn: { display:"block", width:"100%", background:"linear-gradient(135deg,#1e3a8a,#2563eb)", color:"white", border:"none", borderRadius:10, padding:"12px", fontSize:14, fontWeight:700, marginBottom:12 },
  formCard: { background:"white", borderRadius:16, padding:"32px 28px", boxShadow:"0 4px 24px rgba(0,0,0,0.08)", maxWidth:420, width:"100%" },
  formTitle: { fontFamily:"'Lora',serif", fontSize:18, fontWeight:700, color:"#1e3a8a", marginBottom:16, textAlign:"center" },
  backBtn: { background:"none", border:"none", color:"#64748b", fontSize:12, marginBottom:12, padding:0, cursor:"pointer" },
  fieldLabel: { display:"block", fontSize:11, fontWeight:700, color:"#475569", letterSpacing:0.6, textTransform:"uppercase", marginBottom:5 },
  input: { width:"100%", padding:"9px 13px", border:"1.5px solid #e2e8f0", borderRadius:8, fontSize:14, fontFamily:"'Nunito',sans-serif", color:"#111827", background:"#f8faff" },
  helpText: { fontSize:11.5, color:"#6b7280", marginTop:5, lineHeight:1.5, fontStyle:"italic" },
  errorMsg: { background:"#fff1f2", border:"1px solid #fca5a5", borderRadius:7, padding:"8px 12px", fontSize:12.5, color:"#b91c1c", marginTop:8 },
  patientHeader: { maxWidth:1100, margin:"0 auto", padding:"16px 20px 0", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10 },
  patientMeta: { fontSize:12, color:"#64748b", marginTop:2 },
  patientCodeDisplay: { fontFamily:"monospace", fontSize:26, fontWeight:800, color:"#1e3a8a", letterSpacing:3 },
  codeBannerWrap: { maxWidth:1100, margin:"12px auto 0", padding:"0 20px" },
  codeBanner: { background:"#fff7ed", border:"2px solid #fdba74", borderRadius:10, padding:"12px 18px" },
  codeBox: { display:"inline-block", fontFamily:"monospace", fontSize:24, fontWeight:800, background:"#1e3a8a", color:"white", borderRadius:8, padding:"5px 18px", letterSpacing:3 },
  privacyBox: { background:"#f0fdf4", border:"1.5px solid #86efac", borderRadius:10, padding:"12px 14px", marginTop:8 },
  privacyTitle: { fontSize:13, fontWeight:800, color:"#14532d", marginBottom:5 },
  privacyBody: { fontSize:12, color:"#166534", lineHeight:1.6, marginBottom:6 },
  privacyWarn: { fontSize:12, fontWeight:700, color:"#b45309" },
  trackWrap: { padding:"0 0 60px" },
  trackGrid: { maxWidth:1100, margin:"16px auto 0", padding:"0 20px", display:"grid", gridTemplateColumns:"1fr 1.4fr", gap:20, alignItems:"start" },
  card: { background:"white", borderRadius:14, padding:"18px 20px", boxShadow:"0 1px 4px rgba(0,0,0,0.06),0 4px 16px rgba(0,0,0,0.04)" },
  cardTitle: { fontFamily:"'Lora',serif", fontSize:14, fontWeight:700, color:"#1e3a8a" },
  cardRow: { display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 },
  countBadge: { background:"#eff6ff", color:"#1d4ed8", border:"1px solid #bfdbfe", borderRadius:20, padding:"2px 10px", fontSize:11, fontWeight:700 },
  addBtn: { marginTop:10, width:"100%", background:"#1d4ed8", color:"white", border:"none", borderRadius:9, padding:"9px", fontSize:13, fontWeight:700 },
  table: { width:"100%", borderCollapse:"collapse", marginTop:8, fontSize:12.5 },
  th: { padding:"5px 8px", textAlign:"left", fontSize:10, fontWeight:700, color:"#64748b", letterSpacing:0.5, textTransform:"uppercase", borderBottom:"2px solid #e2e8f0" },
  td: { padding:"6px 8px", borderBottom:"1px solid #f1f5f9" },
  removeBtn: { background:"#fee2e2", border:"none", color:"#dc2626", borderRadius:5, width:22, height:22, fontSize:10, fontWeight:700 },
  clearBtn: { background:"none", border:"none", color:"#94a3b8", fontSize:11, cursor:"pointer", textDecoration:"underline" },
  analyzeBtn: { width:"100%", background:"linear-gradient(135deg,#1e3a8a,#2563eb)", color:"white", border:"none", borderRadius:12, padding:"13px", fontSize:14, fontWeight:800, boxShadow:"0 4px 14px rgba(37,99,235,0.3)", display:"flex", alignItems:"center", justifyContent:"center", gap:8 },
  assessLabel: { fontSize:10, fontWeight:700, color:"#64748b", letterSpacing:0.6, textTransform:"uppercase", marginBottom:7 },
  assessSub: { fontSize:10, fontWeight:800, color:"#64748b", letterSpacing:0.5, textTransform:"uppercase", marginBottom:4 },
  assessText: { fontSize:13, color:"#1e293b", lineHeight:1.6 },
  trendPill: { borderRadius:20, padding:"3px 12px", fontSize:12, fontWeight:700 },
  gainPill: { background:"#f1f5f9", color:"#334155", borderRadius:20, padding:"3px 12px", fontSize:12, fontWeight:700 },
  disclaimer: { fontSize:11, color:"#94a3b8", marginTop:10, fontStyle:"italic", borderTop:"1px solid #e2e8f0", paddingTop:8, lineHeight:1.5 },
  emergencyStrip: { background:"#fff1f2", border:"2px solid #fca5a5", borderRadius:10, padding:"10px 16px", fontSize:12.5, color:"#b91c1c", fontWeight:700, textAlign:"center" },
};

const md = {
  wrap: { maxWidth:1100, margin:"0 auto", padding:"20px 20px 60px" },
  dashHeader: { display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12, marginBottom:18 },
  dashTitle: { fontFamily:"'Lora',serif", fontSize:20, fontWeight:700, color:"#1e293b" },
  dashSub: { fontSize:12, color:"#64748b", marginTop:2 },
  backBtn: { background:"white", border:"1.5px solid #e2e8f0", color:"#374151", borderRadius:8, padding:"6px 14px", fontSize:12, fontWeight:600 },
  iconBtn: { background:"white", border:"1.5px solid #e2e8f0", color:"#374151", borderRadius:8, padding:"7px 14px", fontSize:12, fontWeight:600 },
  statsBar: { display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:10, marginBottom:18 },
  statCard: { border:"1.5px solid", borderRadius:12, padding:"14px 12px", cursor:"pointer", textAlign:"center", transition:"transform 0.1s" },
  alertBanner: { background:"#fff7ed", border:"2px solid #fdba74", borderRadius:12, padding:"14px 18px", marginBottom:18 },
  alertTitle: { fontSize:13.5, fontWeight:800, color:"#c2410c" },
  alertChip: { display:"inline-flex", alignItems:"center", gap:8, border:"1.5px solid", borderRadius:20, padding:"5px 12px", fontSize:12.5, flexWrap:"wrap" },
  emailBtn: { color:"white", border:"none", borderRadius:12, padding:"3px 10px", fontSize:11, fontWeight:700 },
  filterRow: { display:"flex", gap:8, alignItems:"center", marginBottom:14, flexWrap:"wrap" },
  filterBtn: { background:"white", border:"1.5px solid #e2e8f0", color:"#475569", borderRadius:8, padding:"6px 14px", fontSize:12, fontWeight:600 },
  filterBtnActive: { background:"#1e3a8a", color:"white", border:"1.5px solid #1e3a8a" },
  patientGrid: { display:"flex", flexDirection:"column", gap:12 },
  ptCard: { background:"white", borderRadius:14, boxShadow:"0 1px 4px rgba(0,0,0,0.06)", border:"1.5px solid #e2e8f0", overflow:"hidden" },
  ptCardTop: { display:"flex", justifyContent:"space-between", alignItems:"flex-start", padding:"16px 18px", cursor:"pointer", gap:12 },
  ptName: { fontFamily:"'Lora',serif", fontSize:16, fontWeight:700, color:"#1e293b" },
  ptMeta: { fontSize:11.5, color:"#94a3b8", marginTop:2 },
  noTierBadge: { fontSize:11, color:"#94a3b8", background:"#f1f5f9", borderRadius:20, padding:"2px 9px", display:"inline-block" },
  baseChip: { fontSize:11, color:"#1a7a4a", background:"#eaf7f0", borderRadius:20, padding:"2px 9px", display:"inline-block", marginLeft:6 },
  gainChip: { fontSize:11, color:"#b91c1c", background:"#fff1f2", borderRadius:20, padding:"2px 9px", display:"inline-block", marginLeft:6 },
  entriesChip: { fontSize:11, color:"#1d4ed8", background:"#eff6ff", borderRadius:12, padding:"2px 8px" },
  ptDetail: { borderTop:"1.5px solid #f1f5f9", padding:"16px 18px", background:"#fafbff" },
  ptDetailGrid: { display:"grid", gridTemplateColumns:"1.2fr 1fr", gap:20 },
  emailBtnLg: { color:"white", border:"none", borderRadius:9, padding:"9px 16px", fontSize:13, fontWeight:700 },
  deleteBtnLg: { background:"white", border:"1.5px solid #fca5a5", color:"#dc2626", borderRadius:9, padding:"8px 14px", fontSize:12, fontWeight:600 },
  emptyState: { textAlign:"center", color:"#94a3b8", padding:"60px 20px", fontSize:14 },
  modalOverlay: { position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:20 },
  modalBox: { background:"white", borderRadius:16, padding:"28px 30px", maxWidth:520, width:"100%", maxHeight:"85vh", overflowY:"auto", boxShadow:"0 20px 60px rgba(0,0,0,0.2)" },
  modalTitle: { fontFamily:"'Lora',serif", fontSize:18, fontWeight:700, color:"#1e293b", marginBottom:20 },
  settingSection: { marginBottom:14 },
  settingLabel: { fontSize:11, fontWeight:700, color:"#374151", letterSpacing:0.5, textTransform:"uppercase", marginBottom:5 },
  settingDivider: { margin:"18px 0 14px", paddingTop:16, borderTop:"1.5px solid #e2e8f0" },
  settingDividerLabel: { fontSize:13, fontWeight:700, color:"#1e3a8a", marginBottom:8 },
  settingHelp: { fontSize:11.5, color:"#6b7280", lineHeight:1.6, background:"#f8fafc", padding:"8px 12px", borderRadius:7, marginBottom:10 },
  saveCfgBtn: { background:"#1e3a8a", color:"white", border:"none", borderRadius:9, padding:"10px 20px", fontSize:13, fontWeight:700 },
  cancelBtn: { background:"white", border:"1.5px solid #e2e8f0", color:"#374151", borderRadius:9, padding:"9px 18px", fontSize:13 },
};
