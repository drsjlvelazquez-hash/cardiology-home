import { useState, useRef } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, Area, AreaChart } from "recharts";

const TIER_CONFIG = {
  1: { color: "#1a7a4a", light: "#eaf7f0", border: "#a8dfc0", icon: "●", label: "Tier 1 — Maintenance", labelEs: "Nivel 1 — Mantenimiento" },
  2: { color: "#b45309", light: "#fffbeb", border: "#fcd34d", icon: "▲", label: "Tier 2 — Weight Alert", labelEs: "Nivel 2 — Alerta de Peso" },
  3: { color: "#b91c1c", light: "#fff1f2", border: "#fca5a5", icon: "⚠", label: "Tier 3 — Emergency", labelEs: "Nivel 3 — Emergencia" },
};

const LABELS = {
  en: {
    appTitle: "Heart Failure Weight Monitor",
    appSub: "Track your weight · Get guidance",
    yourName: "Your Name (optional)",
    namePlaceholder: "e.g. Jane Smith",
    baselineWeight: "Your Baseline Weight (lbs)",
    baselinePlaceholder: "e.g. 165",
    baselineHelp: "This is your 'dry weight' — the weight your doctor recorded when you were feeling well.",
    addWeight: "Add Weight Entry",
    weightLbs: "Weight (lbs)",
    dateLbl: "Date",
    addBtn: "Add Entry",
    tableDate: "Date",
    tableWeight: "Weight",
    tableDiff: "vs. Baseline",
    analyzeBtn: "🤖 Analyze My Weight & Suggest Tier",
    analyzing: "Analyzing your weight trend…",
    clearAll: "Clear all",
    chartTitle: "Your Weight Over Time",
    baselineLine: "Baseline",
    tip1: "✔ Weigh yourself every morning after urinating, before eating.",
    tip2: "✔ Use the same scale each time.",
    tip3: "✔ Record it here daily.",
    emergency: "🚨 If you feel short of breath at rest, chest pain, or can't lie flat — call 911 immediately.",
    noEntries: "No weight entries yet. Add your first entry above.",
    langBtn: "Español",
    assessmentTitle: "AI Assessment",
    disclaimer: "This AI suggestion is for guidance only. Always follow your doctor's instructions. If you feel unwell, call your clinic.",
  },
  es: {
    appTitle: "Monitor de Peso — Insuficiencia Cardíaca",
    appSub: "Registre su peso · Reciba orientación",
    yourName: "Su Nombre (opcional)",
    namePlaceholder: "ej. María García",
    baselineWeight: "Su Peso Base (libras)",
    baselinePlaceholder: "ej. 165",
    baselineHelp: "Este es su 'peso seco' — el peso que su médico registró cuando usted se sentía bien.",
    addWeight: "Agregar Registro de Peso",
    weightLbs: "Peso (libras)",
    dateLbl: "Fecha",
    addBtn: "Agregar",
    tableDate: "Fecha",
    tableWeight: "Peso",
    tableDiff: "vs. Base",
    analyzeBtn: "🤖 Analizar Mi Peso y Sugerir Nivel",
    analyzing: "Analizando su tendencia de peso…",
    clearAll: "Borrar todo",
    chartTitle: "Su Peso a Lo Largo del Tiempo",
    baselineLine: "Base",
    tip1: "✔ Pésese cada mañana después de orinar, antes de comer.",
    tip2: "✔ Use la misma báscula siempre.",
    tip3: "✔ Regístrelo aquí diariamente.",
    emergency: "🚨 Si siente falta de aire en reposo, dolor de pecho o no puede acostarse plano — llame al 911 de inmediato.",
    noEntries: "Aún no hay registros. Agregue su primer registro arriba.",
    langBtn: "English",
    assessmentTitle: "Evaluación de IA",
    disclaimer: "Esta sugerencia de IA es solo orientación. Siga siempre las instrucciones de su médico. Si se siente mal, llame a su clínica.",
  },
};

function formatDate(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${m}/${d}`;
}

function getDiff(w, baseline) {
  if (!baseline) return null;
  return (parseFloat(w) - parseFloat(baseline)).toFixed(1);
}

function DiffBadge({ diff }) {
  if (diff === null) return null;
  const n = parseFloat(diff);
  const color = n > 4 ? "#b91c1c" : n > 3 ? "#b45309" : n > 0 ? "#92400e" : "#1a7a4a";
  const bg = n > 4 ? "#fff1f2" : n > 3 ? "#fffbeb" : n > 0 ? "#fefce8" : "#eaf7f0";
  return (
    <span style={{ background: bg, color, border: `1px solid ${color}`, borderRadius: 6, padding: "1px 7px", fontSize: 12, fontWeight: 700 }}>
      {n > 0 ? `+${diff}` : diff} lbs
    </span>
  );
}

function TierBadge({ tier, lang }) {
  if (!tier) return null;
  const cfg = TIER_CONFIG[tier];
  const label = lang === "es" ? cfg.labelEs : cfg.label;
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: cfg.color, color: "white", borderRadius: 10, padding: "6px 16px", fontWeight: 700, fontSize: 14 }}>
      {cfg.icon} {label}
    </div>
  );
}

const CustomDot = (props) => {
  const { cx, cy, payload, baseline } = props;
  if (!baseline || cx === undefined || cy === undefined) return null;
  const diff = parseFloat(payload.weight) - parseFloat(baseline);
  const color = diff > 4 ? "#b91c1c" : diff > 3 ? "#b45309" : diff > 0 ? "#d97706" : "#1a7a4a";
  return <circle cx={cx} cy={cy} r={5} fill={color} stroke="white" strokeWidth={2} />;
};

export default function App() {
  const [lang, setLang] = useState("en");
  const t = LABELS[lang];

  const [name, setName] = useState("");
  const [baseline, setBaseline] = useState("");
  const [entries, setEntries] = useState([]);
  const [weightInput, setWeightInput] = useState("");
  const [dateInput, setDateInput] = useState(new Date().toISOString().split("T")[0]);
  const [assessment, setAssessment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const assessRef = useRef(null);

  const addEntry = () => {
    if (!weightInput || isNaN(parseFloat(weightInput))) return;
    if (entries.length >= 10) return;
    const newEntry = { date: dateInput, weight: parseFloat(weightInput).toFixed(1) };
    const sorted = [...entries, newEntry].sort((a, b) => new Date(a.date) - new Date(b.date));
    setEntries(sorted);
    setWeightInput("");
    setAssessment(null);
  };

  const removeEntry = (i) => {
    setEntries(entries.filter((_, idx) => idx !== i));
    setAssessment(null);
  };

  const analyze = async () => {
    if (entries.length === 0) return;
    setLoading(true);
    setError("");
    setAssessment(null);

    const entriesText = entries.map(e => {
      const diff = baseline ? ` (${getDiff(e.weight, baseline) > 0 ? "+" : ""}${getDiff(e.weight, baseline)} lbs vs baseline)` : "";
      return `${e.date}: ${e.weight} lbs${diff}`;
    }).join("\n");

    const systemPrompt = lang === "es"
      ? `Eres un asistente médico especializado en insuficiencia cardíaca. Tu tarea es analizar los registros de peso de un paciente y recomendar en qué nivel de tratamiento diurético debe estar, basándote en estas reglas:

NIVEL 1 (Mantenimiento): El peso del paciente está estable, dentro de 3 libras de su peso base.
NIVEL 2 (Alerta de Peso): El paciente ha ganado más de 3 libras sobre su peso base.
NIVEL 3 (Emergencia): El paciente ha ganado más de 6-7 libras sobre su peso base, o ha ganado 3-4 libras adicionales a pesar del tratamiento del Nivel 2.

IMPORTANTE: Responde SOLO con JSON válido, sin texto adicional, sin bloques de código, en este formato exacto:
{
  "tier": 1,
  "summary": "Resumen breve en español (2-3 oraciones)",
  "reasoning": "Explicación del razonamiento en español (2-3 oraciones)",
  "action": "Qué debe hacer el paciente ahora en español (1-2 oraciones)",
  "trend": "improving" | "stable" | "worsening",
  "maxGain": número (máxima ganancia en libras vs baseline, o 0 si no hay baseline)
}`
      : `You are a medical assistant specializing in heart failure care. Your task is to analyze a patient's weight log and recommend which diuretic management tier they should be on, based on these rules:

TIER 1 (Maintenance): Patient's weight is stable, within 3 lbs of their baseline.
TIER 2 (Weight Alert): Patient has gained more than 3 lbs over their baseline weight.
TIER 3 (Emergency): Patient has gained more than 6-7 lbs over baseline, or gained 3-4 additional lbs despite Tier 2 treatment.

IMPORTANT: Respond ONLY with valid JSON, no extra text, no code blocks, in this exact format:
{
  "tier": 1,
  "summary": "Brief summary in English (2-3 sentences)",
  "reasoning": "Explanation of reasoning (2-3 sentences)",
  "action": "What the patient should do now (1-2 sentences)",
  "trend": "improving" | "stable" | "worsening",
  "maxGain": number (max gain in lbs vs baseline, or 0 if no baseline)
}`;

    const userMsg = lang === "es"
      ? `Nombre del paciente: ${name || "No proporcionado"}
Peso base: ${baseline ? `${baseline} libras` : "No proporcionado"}
Número de registros: ${entries.length}

Registros de peso:
${entriesText}

Por favor analiza esta tendencia y recomienda el nivel de tratamiento apropiado.`
      : `Patient name: ${name || "Not provided"}
Baseline weight: ${baseline ? `${baseline} lbs` : "Not provided"}
Number of entries: ${entries.length}

Weight log:
${entriesText}

Please analyze this trend and recommend the appropriate treatment tier.`;

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: systemPrompt,
          messages: [{ role: "user", content: userMsg }],
        }),
      });
      const data = await response.json();
      const raw = data.content.map(b => b.text || "").join("");
      const clean = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setAssessment(parsed);
      setTimeout(() => assessRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch (e) {
      setError(lang === "es" ? "Error al analizar. Por favor intente de nuevo." : "Analysis failed. Please try again.");
    }
    setLoading(false);
  };

  const chartData = entries.map(e => ({ date: formatDate(e.date), weight: parseFloat(e.weight), fullDate: e.date }));
  const weights = entries.map(e => parseFloat(e.weight));
  const minY = baseline ? Math.min(...weights, parseFloat(baseline)) - 3 : Math.min(...weights, 0) - 3;
  const maxY = baseline ? Math.max(...weights, parseFloat(baseline)) + 3 : Math.max(...weights, 0) + 3;

  const tier1Line = baseline ? parseFloat(baseline) + 3 : null;
  const tier2Line = baseline ? parseFloat(baseline) + 6 : null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&family=Lora:wght@400;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #f0f6ff; font-family: 'Nunito', sans-serif; }
        input:focus, select:focus { outline: 2px solid #2563eb; outline-offset: 1px; }
        button { font-family: 'Nunito', sans-serif; }
      `}</style>

      <div style={s.shell}>
        {/* Header */}
        <div style={s.header}>
          <div style={s.headerInner}>
            <div style={s.logoRow}>
              <span style={s.heartIcon}>♥</span>
              <div>
                <div style={s.appTitle}>{t.appTitle}</div>
                <div style={s.appSub}>{t.appSub}</div>
              </div>
            </div>
            <button style={s.langBtn} onClick={() => { setLang(l => l === "en" ? "es" : "en"); setAssessment(null); }}>
              {t.langBtn}
            </button>
          </div>
        </div>

        <div style={s.main}>
          {/* Tips Banner */}
          <div style={s.tipsBanner}>
            <span>{t.tip1}</span><span>{t.tip2}</span><span>{t.tip3}</span>
          </div>

          <div style={s.grid}>
            {/* Left Column */}
            <div style={s.leftCol}>
              {/* Setup Card */}
              <div style={s.card}>
                <div style={s.cardTitle}>{t.yourName}</div>
                <input type="text" style={s.input} placeholder={t.namePlaceholder} value={name} onChange={e => setName(e.target.value)} />

                <div style={{ marginTop: 16 }}>
                  <div style={s.cardTitle}>{t.baselineWeight}</div>
                  <input type="number" style={s.input} placeholder={t.baselinePlaceholder} value={baseline}
                    onChange={e => { setBaseline(e.target.value); setAssessment(null); }} />
                  <div style={s.helpText}>{t.baselineHelp}</div>
                </div>
              </div>

              {/* Add Entry Card */}
              <div style={s.card}>
                <div style={s.sectionHeader}>
                  <div style={s.cardTitle}>{t.addWeight}</div>
                  <span style={s.countBadge}>{entries.length}/10</span>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                  <div style={{ flex: "1 1 100px" }}>
                    <label style={s.fieldLabel}>{t.weightLbs}</label>
                    <input type="number" step="0.1" style={s.input} placeholder="165.0" value={weightInput}
                      onChange={e => setWeightInput(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && addEntry()} />
                  </div>
                  <div style={{ flex: "1 1 130px" }}>
                    <label style={s.fieldLabel}>{t.dateLbl}</label>
                    <input type="date" style={s.input} value={dateInput} onChange={e => setDateInput(e.target.value)} />
                  </div>
                </div>
                <button style={{ ...s.addBtn, opacity: entries.length >= 10 || !weightInput ? 0.5 : 1 }}
                  disabled={entries.length >= 10 || !weightInput} onClick={addEntry}>
                  + {t.addBtn}
                </button>
              </div>

              {/* Weight Log Table */}
              {entries.length > 0 && (
                <div style={s.card}>
                  <div style={s.sectionHeader}>
                    <div style={s.cardTitle}>{t.chartTitle}</div>
                    <button style={s.clearBtn} onClick={() => { setEntries([]); setAssessment(null); }}>{t.clearAll}</button>
                  </div>
                  <table style={s.table}>
                    <thead>
                      <tr>
                        <th style={s.th}>{t.tableDate}</th>
                        <th style={s.th}>{t.tableWeight}</th>
                        {baseline && <th style={s.th}>{t.tableDiff}</th>}
                        <th style={s.th}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {entries.map((e, i) => {
                        const diff = getDiff(e.weight, baseline);
                        return (
                          <tr key={i} style={{ background: i % 2 === 0 ? "#f8faff" : "white" }}>
                            <td style={s.td}>{e.date}</td>
                            <td style={{ ...s.td, fontWeight: 700 }}>{e.weight} lbs</td>
                            {baseline && <td style={s.td}><DiffBadge diff={diff} /></td>}
                            <td style={s.td}>
                              <button onClick={() => removeEntry(i)} style={s.removeBtn}>✕</button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Right Column */}
            <div style={s.rightCol}>
              {/* Chart */}
              {entries.length > 0 ? (
                <div style={s.card}>
                  <div style={s.cardTitle}>{t.chartTitle}</div>
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="wGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#2563eb" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#64748b" }} />
                      <YAxis domain={[minY, maxY]} tick={{ fontSize: 11, fill: "#64748b" }} unit=" lb" width={52} />
                      <Tooltip
                        formatter={(v, n) => [`${v} lbs`, lang === "es" ? "Peso" : "Weight"]}
                        contentStyle={{ borderRadius: 8, fontSize: 13 }}
                      />
                      {baseline && (
                        <ReferenceLine y={parseFloat(baseline)} stroke="#1a7a4a" strokeWidth={2} strokeDasharray="6 3"
                          label={{ value: t.baselineLine, position: "insideTopRight", fontSize: 11, fill: "#1a7a4a" }} />
                      )}
                      {tier1Line && (
                        <ReferenceLine y={tier1Line} stroke="#b45309" strokeWidth={1.5} strokeDasharray="4 3"
                          label={{ value: "+3 lbs", position: "insideTopRight", fontSize: 10, fill: "#b45309" }} />
                      )}
                      {tier2Line && (
                        <ReferenceLine y={tier2Line} stroke="#b91c1c" strokeWidth={1.5} strokeDasharray="4 3"
                          label={{ value: "+6 lbs", position: "insideTopRight", fontSize: 10, fill: "#b91c1c" }} />
                      )}
                      <Area type="monotone" dataKey="weight" stroke="#2563eb" strokeWidth={2.5} fill="url(#wGrad)"
                        dot={<CustomDot baseline={baseline} />} activeDot={{ r: 7 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                  {baseline && (
                    <div style={s.legendRow}>
                      <span style={s.legendItem}><span style={{ ...s.legendDot, background: "#1a7a4a" }} />Baseline</span>
                      <span style={s.legendItem}><span style={{ ...s.legendDot, background: "#b45309" }} />+3 lbs — Tier 2</span>
                      <span style={s.legendItem}><span style={{ ...s.legendDot, background: "#b91c1c" }} />+6 lbs — Tier 3</span>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ ...s.card, textAlign: "center", color: "#94a3b8", padding: "48px 24px" }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>⚖️</div>
                  <div style={{ fontSize: 14 }}>{t.noEntries}</div>
                </div>
              )}

              {/* Analyze Button */}
              {entries.length > 0 && (
                <button style={{ ...s.analyzeBtn, opacity: loading ? 0.7 : 1 }} disabled={loading} onClick={analyze}>
                  {loading ? (
                    <span>{t.analyzing}</span>
                  ) : (
                    <span>{t.analyzeBtn}</span>
                  )}
                </button>
              )}

              {error && <div style={s.errorBox}>{error}</div>}

              {/* Assessment Result */}
              {assessment && (
                <div ref={assessRef} style={{ ...s.card, border: `2px solid ${TIER_CONFIG[assessment.tier]?.color}`, background: TIER_CONFIG[assessment.tier]?.light }}>
                  <div style={{ marginBottom: 14 }}>
                    <div style={s.assessLabel}>{t.assessmentTitle}</div>
                    <TierBadge tier={assessment.tier} lang={lang} />
                  </div>

                  {/* Trend indicator */}
                  <div style={s.trendRow}>
                    <span style={{ ...s.trendPill, background: assessment.trend === "improving" ? "#eaf7f0" : assessment.trend === "worsening" ? "#fff1f2" : "#f1f5f9", color: assessment.trend === "improving" ? "#1a7a4a" : assessment.trend === "worsening" ? "#b91c1c" : "#475569" }}>
                      {assessment.trend === "improving" ? "📉 " : assessment.trend === "worsening" ? "📈 " : "➡ "}
                      {assessment.trend === "improving"
                        ? (lang === "es" ? "Tendencia mejorando" : "Trend improving")
                        : assessment.trend === "worsening"
                        ? (lang === "es" ? "Tendencia empeorando" : "Trend worsening")
                        : (lang === "es" ? "Tendencia estable" : "Trend stable")}
                    </span>
                    {assessment.maxGain > 0 && (
                      <span style={s.gainPill}>
                        {lang === "es" ? "Máx. ganancia:" : "Max gain:"} +{assessment.maxGain} lbs
                      </span>
                    )}
                  </div>

                  <div style={s.assessSection}>
                    <div style={s.assessSectionTitle}>{lang === "es" ? "Resumen" : "Summary"}</div>
                    <div style={s.assessText}>{assessment.summary}</div>
                  </div>

                  <div style={s.assessSection}>
                    <div style={s.assessSectionTitle}>{lang === "es" ? "Razonamiento" : "Reasoning"}</div>
                    <div style={s.assessText}>{assessment.reasoning}</div>
                  </div>

                  <div style={{ ...s.assessSection, background: TIER_CONFIG[assessment.tier]?.color + "15", border: `1px solid ${TIER_CONFIG[assessment.tier]?.border}`, borderRadius: 8, padding: "10px 14px" }}>
                    <div style={s.assessSectionTitle}>{lang === "es" ? "⚡ Qué hacer ahora" : "⚡ What to do now"}</div>
                    <div style={{ ...s.assessText, fontWeight: 600 }}>{assessment.action}</div>
                  </div>

                  <div style={s.disclaimer}>{t.disclaimer}</div>
                </div>
              )}

              {/* Emergency strip */}
              <div style={s.emergencyStrip}>{t.emergency}</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

const s = {
  shell: { minHeight: "100vh", background: "linear-gradient(160deg,#e8f0fe 0%,#f0f6ff 60%,#fef9ee 100%)", fontFamily: "'Nunito', sans-serif" },
  header: { background: "linear-gradient(135deg,#1e3a8a 0%,#1d4ed8 100%)", color: "white", padding: "0 20px", boxShadow: "0 2px 16px rgba(30,58,138,0.3)" },
  headerInner: { maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0" },
  logoRow: { display: "flex", alignItems: "center", gap: 12 },
  heartIcon: { fontSize: 32, color: "#fca5a5", filter: "drop-shadow(0 0 6px rgba(252,165,165,0.5))" },
  appTitle: { fontFamily: "'Lora', serif", fontSize: 18, fontWeight: 700, letterSpacing: 0.2 },
  appSub: { fontSize: 11, color: "#93c5fd", marginTop: 2, letterSpacing: 0.4 },
  langBtn: { background: "rgba(255,255,255,0.15)", border: "1.5px solid rgba(255,255,255,0.3)", color: "white", borderRadius: 8, padding: "7px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", letterSpacing: 0.3 },
  main: { maxWidth: 1100, margin: "0 auto", padding: "20px 16px 60px" },
  tipsBanner: { display: "flex", gap: 24, flexWrap: "wrap", background: "#dbeafe", border: "1px solid #93c5fd", borderRadius: 10, padding: "10px 18px", marginBottom: 20, fontSize: 12.5, color: "#1e40af", fontWeight: 600 },
  grid: { display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 20, alignItems: "start" },
  leftCol: { display: "flex", flexDirection: "column", gap: 16 },
  rightCol: { display: "flex", flexDirection: "column", gap: 16 },
  card: { background: "white", borderRadius: 14, padding: "20px 22px", boxShadow: "0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)" },
  cardTitle: { fontFamily: "'Lora', serif", fontSize: 15, fontWeight: 700, color: "#1e3a8a", marginBottom: 10 },
  sectionHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  countBadge: { background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe", borderRadius: 20, padding: "2px 10px", fontSize: 12, fontWeight: 700 },
  fieldLabel: { display: "block", fontSize: 11, fontWeight: 700, color: "#475569", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 4 },
  input: { width: "100%", padding: "9px 13px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 14, fontFamily: "'Nunito', sans-serif", color: "#111827", background: "#f8faff" },
  helpText: { fontSize: 11.5, color: "#6b7280", marginTop: 6, lineHeight: 1.5, fontStyle: "italic" },
  addBtn: { marginTop: 12, width: "100%", background: "#1d4ed8", color: "white", border: "none", borderRadius: 9, padding: "10px", fontSize: 14, fontWeight: 700, cursor: "pointer" },
  table: { width: "100%", borderCollapse: "collapse", marginTop: 8, fontSize: 13 },
  th: { padding: "6px 10px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#64748b", letterSpacing: 0.5, textTransform: "uppercase", borderBottom: "2px solid #e2e8f0" },
  td: { padding: "7px 10px", borderBottom: "1px solid #f1f5f9" },
  removeBtn: { background: "#fee2e2", border: "none", color: "#dc2626", borderRadius: 6, width: 24, height: 24, cursor: "pointer", fontSize: 11, fontWeight: 700 },
  clearBtn: { background: "none", border: "none", color: "#94a3b8", fontSize: 12, cursor: "pointer", textDecoration: "underline" },
  legendRow: { display: "flex", gap: 16, flexWrap: "wrap", marginTop: 10, fontSize: 12 },
  legendItem: { display: "flex", alignItems: "center", gap: 5, color: "#475569" },
  legendDot: { width: 10, height: 10, borderRadius: "50%", display: "inline-block" },
  analyzeBtn: { width: "100%", background: "linear-gradient(135deg,#1e3a8a,#2563eb)", color: "white", border: "none", borderRadius: 12, padding: "14px", fontSize: 15, fontWeight: 800, cursor: "pointer", boxShadow: "0 4px 14px rgba(37,99,235,0.35)", letterSpacing: 0.3 },
  errorBox: { background: "#fff1f2", border: "1.5px solid #fca5a5", borderRadius: 8, padding: "10px 14px", color: "#b91c1c", fontSize: 13 },
  assessLabel: { fontSize: 11, fontWeight: 700, color: "#64748b", letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 8 },
  trendRow: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 },
  trendPill: { borderRadius: 20, padding: "4px 12px", fontSize: 12.5, fontWeight: 700 },
  gainPill: { background: "#f1f5f9", color: "#334155", borderRadius: 20, padding: "4px 12px", fontSize: 12.5, fontWeight: 700 },
  assessSection: { marginBottom: 12 },
  assessSectionTitle: { fontSize: 11, fontWeight: 800, color: "#64748b", letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 5 },
  assessText: { fontSize: 13.5, color: "#1e293b", lineHeight: 1.6 },
  disclaimer: { fontSize: 11, color: "#94a3b8", marginTop: 14, fontStyle: "italic", borderTop: "1px solid #e2e8f0", paddingTop: 10, lineHeight: 1.5 },
  emergencyStrip: { background: "#fff1f2", border: "2px solid #fca5a5", borderRadius: 10, padding: "10px 16px", fontSize: 12.5, color: "#b91c1c", fontWeight: 700, textAlign: "center" },
};
