import { useState } from "react";

const MEDICATIONS = {
  bumetanide: {
    label: "Bumetanide",
    doses: ["0.5 mg", "1 mg", "1.5 mg", "2 mg"],
    frequency: ["once daily", "twice daily", "three times daily"],
    note: "Take in the morning",
  },
  torsemide: {
    label: "Torsemide",
    doses: ["10 mg", "20 mg"],
    frequency: ["once daily", "twice daily"],
    note: "Take in the morning",
  },
  metolazone: {
    label: "Metolazone",
    doses: ["5 mg", "10 mg"],
    frequency: ["once daily", "30 min before loop diuretic"],
    note: "Use with caution — potent; monitor electrolytes",
  },
  furosemide_sc: {
    label: "Furosemide SC",
    doses: ["40 mg", "80 mg", "120 mg"],
    frequency: ["once", "over 4 hours SC infusion"],
    note: "Subcutaneous regimen — clinic-administered",
  },
};

// ─── Translations ───────────────────────────────────────────────────────────
const T = {
  en: {
    clinicName: "Heart Failure Clinic",
    clinicSub: "Personalized Diuretic Self-Management Plan",
    dailyTitle: "📋 Daily Instructions — All Patients",
    instructions: [
      { icon: "🧂", title: "Watch Your Salt", body: "Avoid high-sodium foods: pretzels, chips, canned soups, deli meats, fast food. Target less than 2,000 mg sodium per day." },
      { icon: "💧", title: "Limit Your Fluids", body: "Drink water when thirsty and with meals. Track all fluids. Do not exceed ½ gallon (64 oz / ~2 liters) per day total." },
      { icon: "⚖️", title: "Weigh Yourself Every Morning", body: "Weigh after urinating, before eating or drinking, on the same scale, every day. Record the number in your weight log." },
    ],
    planTitle: "💊 Your Personalized Diuretic Action Plan",
    when: "When:",
    action: "Action:",
    noMed: "No medication assigned for this tier.",
    instructionsLabel: "📝 Instructions:",
    rxLabel: (n) => `Rx ${n}`,
    emergency: {
      title: "🚨 Call 911 or go to the ER immediately if you experience:",
      items: ["Sudden shortness of breath at rest", "Chest pain or pressure", "Rapid or irregular heartbeat", "Fainting or near-fainting", "Unable to lie flat due to breathlessness"],
    },
    footer: "This plan was provided by your Heart Failure Clinic. Always follow your provider's specific instructions. Keep this sheet with your daily weight log.",
    dateLabel: "Date:",
    providerLabel: "Provider:",
  },
  es: {
    clinicName: "Clínica de Insuficiencia Cardíaca",
    clinicSub: "Plan Personalizado de Autocontrol con Diuréticos",
    dailyTitle: "📋 Instrucciones Diarias — Todos los Pacientes",
    instructions: [
      { icon: "🧂", title: "Cuide Su Consumo de Sal", body: "Evite alimentos altos en sodio: pretzels, papitas, sopas enlatadas, embutidos, comida rápida. Meta: menos de 2,000 mg de sodio por día." },
      { icon: "💧", title: "Limite Sus Líquidos", body: "Beba agua cuando tenga sed y con las comidas. Lleve la cuenta de todos los líquidos que consume. No exceda ½ galón (64 oz / ~2 litros) por día en total." },
      { icon: "⚖️", title: "Pésese Cada Mañana", body: "Pésese después de orinar, antes de comer o beber, en la misma báscula, todos los días. Anote el número en su registro de peso." },
    ],
    planTitle: "💊 Su Plan de Acción Personalizado con Diuréticos",
    when: "Cuándo:",
    action: "Acción:",
    noMed: "No se asignó medicamento para este nivel.",
    instructionsLabel: "📝 Instrucciones:",
    rxLabel: (n) => `Rx ${n}`,
    emergency: {
      title: "🚨 Llame al 911 o vaya a urgencias inmediatamente si presenta:",
      items: ["Falta de aire repentina en reposo", "Dolor o presión en el pecho", "Latidos rápidos o irregulares", "Desmayo o sensación de desmayo", "Incapacidad para acostarse plano por falta de aire"],
    },
    footer: "Este plan fue proporcionado por su Clínica de Insuficiencia Cardíaca. Siga siempre las instrucciones específicas de su médico. Guarde esta hoja junto con su registro diario de peso.",
    dateLabel: "Fecha:",
    providerLabel: "Médico:",
  },
};

const TIER_INFO = {
  en: [
    {
      number: 1, color: "#1a7a4a", lightColor: "#eaf7f0", borderColor: "#a8dfc0", icon: "●",
      label: "Tier 1 — Maintenance",
      trigger: "Daily baseline regimen prescribed at your clinic visit.",
      action: "Take your medication(s) as directed every day.",
      escalate: "If your weight increases more than 3 lbs above your baseline weight → move to Tier 2.",
      maxMeds: 2,
    },
    {
      number: 2, color: "#b45309", lightColor: "#fffbeb", borderColor: "#fcd34d", icon: "▲",
      label: "Tier 2 — Weight Alert",
      trigger: "Weight gain of more than 3 lbs over your baseline weight.",
      action: "Take your Tier 2 medication(s) immediately, in addition to your Tier 1 medications.",
      escalate: "If your weight increases another 3–4 lbs despite Tier 2 → move to Tier 3 and call the office.",
      maxMeds: 2,
    },
    {
      number: 3, color: "#b91c1c", lightColor: "#fff1f2", borderColor: "#fca5a5", icon: "⚠",
      label: "Tier 3 — Emergency",
      trigger: "Weight gain of 3–4 lbs despite Tier 2 treatment.",
      action: "Take your Tier 3 medications and call your cardiologist's office immediately.",
      escalate: null,
      maxMeds: 3,
    },
  ],
  es: [
    {
      number: 1, color: "#1a7a4a", lightColor: "#eaf7f0", borderColor: "#a8dfc0", icon: "●",
      label: "Nivel 1 — Mantenimiento",
      trigger: "Régimen base diario prescrito en su visita a la clínica.",
      action: "Tome sus medicamentos según lo indicado todos los días.",
      escalate: "Si su peso aumenta más de 3 libras sobre su peso base → pase al Nivel 2.",
      maxMeds: 2,
    },
    {
      number: 2, color: "#b45309", lightColor: "#fffbeb", borderColor: "#fcd34d", icon: "▲",
      label: "Nivel 2 — Alerta de Peso",
      trigger: "Aumento de peso de más de 3 libras sobre su peso base.",
      action: "Tome los medicamentos del Nivel 2 de inmediato, además de los del Nivel 1.",
      escalate: "Si su peso aumenta otras 3–4 libras a pesar del Nivel 2 → pase al Nivel 3 y llame al consultorio.",
      maxMeds: 2,
    },
    {
      number: 3, color: "#b91c1c", lightColor: "#fff1f2", borderColor: "#fca5a5", icon: "⚠",
      label: "Nivel 3 — Emergencia",
      trigger: "Aumento de peso de 3–4 libras a pesar del tratamiento del Nivel 2.",
      action: "Tome los medicamentos del Nivel 3 y llame de inmediato al consultorio de su cardiólogo.",
      escalate: null,
      maxMeds: 3,
    },
  ],
};

const PRESET_NOTES = {
  1: [
    { label: "Select a template or type below…", value: "" },
    { label: "Metolazone → loop diuretic sequence", value: "Take Metolazone first. Wait 30 minutes, then take your Bumetanide or Torsemide. This sequence makes both medications more effective." },
    { label: "Morning only — avoid evening dose", value: "Take all medications in the morning to avoid nighttime urination. Do not take after noon." },
    { label: "Take with potassium supplement", value: "Take your diuretic with a potassium supplement as directed. This helps prevent low potassium levels." },
    { label: "Monitor electrolytes in 3–5 days", value: "Get a blood electrolyte check within 3–5 days of starting this regimen. Call the office with your results." },
  ],
  2: [
    { label: "Select a template or type below…", value: "" },
    { label: "Metolazone + loop diuretic sequence (Tier 2)", value: "Take Metolazone first. Wait 30 minutes, then take your Bumetanide or Torsemide. This combination is powerful — expect significantly increased urination for several hours." },
    { label: "Add to Tier 1 — do not stop Tier 1", value: "Take this medication IN ADDITION to your Tier 1 medications. Do not stop your Tier 1 regimen. Continue both until your weight returns to baseline." },
    { label: "Single extra dose, then recheck weight", value: "Take this as one extra dose today. Recheck your weight tomorrow morning. If your weight is still rising, move to Tier 3 and call the office." },
    { label: "Urgent electrolyte check within 48–72 hrs", value: "Get a blood electrolyte check within 48–72 hours of taking this dose. Call the office with your results so we can monitor your kidney function." },
  ],
  3: [
    { label: "Select a template or type below…", value: "" },
    { label: "Start SC + continue orals + call office now", value: "Start your Furosemide SC and continue taking your other oral diuretics as usual. Call the cardiology office immediately to notify us you have reached this level. Do not wait." },
    { label: "SC infusion + call office right away", value: "Begin the Furosemide SC infusion as instructed. Call the office right away — we will guide your next steps or arrange an urgent clinic visit." },
    { label: "All medications + urgent call", value: "Take all three medications as listed in order. Call your cardiologist's office immediately. If you cannot reach us within 30 minutes, go to the nearest emergency room." },
    { label: "Emergency escalation — 911 if severe symptoms", value: "This is an urgent situation. Take your medications and call the office NOW. If you feel short of breath at rest, have chest pain, or cannot lie flat — call 911 immediately. Do not drive yourself." },
  ],
};

// Spanish versions of notes for the printed handout
const NOTES_ES = {
  "Take Metolazone first. Wait 30 minutes, then take your Bumetanide or Torsemide. This sequence makes both medications more effective.":
    "Tome la Metolazona primero. Espere 30 minutos y luego tome su Bumetanida o Torasemida. Esta secuencia hace que ambos medicamentos sean más efectivos.",
  "Take all medications in the morning to avoid nighttime urination. Do not take after noon.":
    "Tome todos los medicamentos por la mañana para evitar orinar de noche. No los tome después del mediodía.",
  "Take your diuretic with a potassium supplement as directed. This helps prevent low potassium levels.":
    "Tome su diurético con un suplemento de potasio según lo indicado. Esto ayuda a prevenir niveles bajos de potasio.",
  "Get a blood electrolyte check within 3–5 days of starting this regimen. Call the office with your results.":
    "Hágase un análisis de electrolitos en sangre dentro de 3–5 días de iniciar este régimen. Llame al consultorio con sus resultados.",
  "Take Metolazone first. Wait 30 minutes, then take your Bumetanide or Torsemide. This combination is powerful — expect significantly increased urination for several hours.":
    "Tome la Metolazona primero. Espere 30 minutos y luego tome su Bumetanida o Torasemida. Esta combinación es poderosa — espere un aumento significativo de la orina por varias horas.",
  "Take this medication IN ADDITION to your Tier 1 medications. Do not stop your Tier 1 regimen. Continue both until your weight returns to baseline.":
    "Tome este medicamento ADEMÁS de los del Nivel 1. No deje de tomar el régimen del Nivel 1. Continúe ambos hasta que su peso vuelva a la línea base.",
  "Take this as one extra dose today. Recheck your weight tomorrow morning. If your weight is still rising, move to Tier 3 and call the office.":
    "Tome esta dosis extra hoy. Vuelva a pesarse mañana por la mañana. Si su peso sigue subiendo, pase al Nivel 3 y llame al consultorio.",
  "Get a blood electrolyte check within 48–72 hours of taking this dose. Call the office with your results so we can monitor your kidney function.":
    "Hágase un análisis de electrolitos en sangre dentro de 48–72 horas. Llame al consultorio con sus resultados para que podamos monitorear su función renal.",
  "Start your Furosemide SC and continue taking your other oral diuretics as usual. Call the cardiology office immediately to notify us you have reached this level. Do not wait.":
    "Comience su Furosemida SC y continúe tomando sus otros diuréticos orales como de costumbre. Llame al consultorio de cardiología de inmediato para notificarnos que ha llegado a este nivel. No espere.",
  "Begin the Furosemide SC infusion as instructed. Call the office right away — we will guide your next steps or arrange an urgent clinic visit.":
    "Comience la infusión de Furosemida SC según lo indicado. Llame al consultorio de inmediato — lo guiaremos en los próximos pasos o programaremos una visita urgente.",
  "Take all three medications as listed in order. Call your cardiologist's office immediately. If you cannot reach us within 30 minutes, go to the nearest emergency room.":
    "Tome los tres medicamentos en el orden indicado. Llame de inmediato al consultorio de su cardiólogo. Si no nos puede contactar en 30 minutos, vaya a la sala de emergencias más cercana.",
  "This is an urgent situation. Take your medications and call the office NOW. If you feel short of breath at rest, have chest pain, or cannot lie flat — call 911 immediately. Do not drive yourself.":
    "Esta es una situación urgente. Tome sus medicamentos y llame al consultorio AHORA. Si siente falta de aire en reposo, dolor en el pecho, o no puede acostarse plano — llame al 911 de inmediato. No maneje solo.",
};

const getNote = (notes, lang) => {
  if (lang === "en" || !notes) return notes;
  return NOTES_ES[notes] || notes;
};

const emptyDrug = () => ({ drug: "", dose: "", frequency: "" });
const emptyTier = () => ({ drugs: [emptyDrug()], notes: "", notesPreset: "" });

// ─── SingleMedRow ────────────────────────────────────────────────────────────
function SingleMedRow({ value, onChange, onRemove, showRemove, index, showLabels }) {
  const selected = value.drug ? MEDICATIONS[value.drug] : null;
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
      <div style={styles.indexBadge}>{index + 1}</div>
      <div style={{ flex: "1 1 170px" }}>
        {showLabels && <label style={styles.fieldLabel}>Medication</label>}
        <select style={styles.select} value={value.drug}
          onChange={(e) => onChange({ ...value, drug: e.target.value, dose: "", frequency: "" })}>
          <option value="">— Select drug —</option>
          {Object.entries(MEDICATIONS).map(([key, med]) => (
            <option key={key} value={key}>{med.label}</option>
          ))}
        </select>
      </div>
      <div style={{ flex: "1 1 110px" }}>
        {showLabels && <label style={styles.fieldLabel}>Dose</label>}
        <select style={{ ...styles.select, opacity: selected ? 1 : 0.45 }} value={value.dose}
          disabled={!selected} onChange={(e) => onChange({ ...value, dose: e.target.value })}>
          <option value="">— Dose —</option>
          {selected && selected.doses.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>
      <div style={{ flex: "1 1 160px" }}>
        {showLabels && <label style={styles.fieldLabel}>Frequency</label>}
        <select style={{ ...styles.select, opacity: selected ? 1 : 0.45 }} value={value.frequency}
          disabled={!selected} onChange={(e) => onChange({ ...value, frequency: e.target.value })}>
          <option value="">— Frequency —</option>
          {selected && selected.frequency.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>
      {showRemove
        ? <button onClick={onRemove} style={styles.removBtn} title="Remove">✕</button>
        : <div style={{ width: 28 }} />}
    </div>
  );
}

// ─── TierEditor ──────────────────────────────────────────────────────────────
function TierEditor({ tierInfo, value, onChange }) {
  const { drugs, notes, notesPreset } = value;
  const presets = PRESET_NOTES[tierInfo.number];

  const updateDrug = (i, v) => { const next = [...drugs]; next[i] = v; onChange({ ...value, drugs: next }); };
  const addDrug = () => { if (drugs.length < tierInfo.maxMeds) onChange({ ...value, drugs: [...drugs, emptyDrug()] }); };
  const removeDrug = (i) => onChange({ ...value, drugs: drugs.filter((_, idx) => idx !== i) });
  const handlePreset = (e) => onChange({ ...value, notesPreset: e.target.value, notes: e.target.value });
  const showMetoHint = drugs.length >= 2 && drugs[0].drug === "metolazone" && drugs[1].drug && drugs[1].drug !== "metolazone";

  return (
    <div style={{ ...styles.card, borderLeft: `5px solid ${tierInfo.color}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <span style={{ ...styles.tierPill, background: tierInfo.color }}>{tierInfo.icon} {tierInfo.label}</span>
        <span style={{ fontSize: 12, color: "#6b7280" }}>up to {tierInfo.maxMeds} medication{tierInfo.maxMeds > 1 ? "s" : ""}</span>
      </div>
      <p style={{ fontSize: 13, color: "#4b5563", marginBottom: 16, lineHeight: 1.5 }}>
        <strong>Triggered when:</strong> {tierInfo.trigger}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {drugs.map((d, i) => (
          <div key={i}>
            {d.drug && MEDICATIONS[d.drug] && (
              <div style={styles.drugHint}>ℹ {MEDICATIONS[d.drug].note}</div>
            )}
            <SingleMedRow index={i} showLabels={i === 0} value={d} showRemove={drugs.length > 1}
              onChange={(v) => updateDrug(i, v)} onRemove={() => removeDrug(i)} />
          </div>
        ))}
      </div>
      {drugs.length < tierInfo.maxMeds && (
        <button onClick={addDrug} style={styles.addMedBtn}>
          + Add {drugs.length === 1 ? "a second" : "a third"} medication
        </button>
      )}
      {showMetoHint && (
        <div style={styles.hintBox}>
          💡 <strong>Reminder:</strong> Metolazone is first — a 30-minute wait template is available in the dropdown below.
        </div>
      )}
      <div style={{ marginTop: 16 }}>
        <label style={styles.fieldLabel}>Patient Instructions</label>
        <select style={{ ...styles.select, marginBottom: 8 }} value={notesPreset} onChange={handlePreset}>
          {presets.map((p) => <option key={p.label} value={p.value}>{p.label}</option>)}
        </select>
        <textarea style={styles.textarea} rows={3}
          placeholder="Select a template above, or type custom instructions here…"
          value={notes}
          onChange={(e) => onChange({ ...value, notes: e.target.value, notesPreset: "" })} />
      </div>
    </div>
  );
}

// ─── PrintView ───────────────────────────────────────────────────────────────
function PrintView({ patient, date, physician, tiers, lang }) {
  const t = T[lang];
  const tierDefs = TIER_INFO[lang];

  return (
    <div id="print-area" style={printStyles.page}>
      {/* Header */}
      <div style={printStyles.header}>
        <div>
          <div style={printStyles.clinicName}>{t.clinicName}</div>
          <div style={printStyles.clinicSub}>{t.clinicSub}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={printStyles.patientName}>{patient || (lang === "es" ? "Paciente" : "Patient")}</div>
          <div style={printStyles.meta}>{t.dateLabel} {date}</div>
          {physician && <div style={printStyles.meta}>{t.providerLabel} {physician}</div>}
        </div>
      </div>

      <div style={printStyles.divider} />

      {/* Universal instructions */}
      <div style={printStyles.section}>
        <div style={printStyles.sectionTitle}>{t.dailyTitle}</div>
        <div style={printStyles.instructionGrid}>
          {t.instructions.map(({ icon, title, body }) => (
            <div key={title} style={printStyles.instructionCard}>
              <div style={printStyles.instructionIcon}>{icon}</div>
              <div><strong>{title}</strong><div style={printStyles.instructionText}>{body}</div></div>
            </div>
          ))}
        </div>
      </div>

      <div style={printStyles.divider} />

      {/* Tier plan */}
      <div style={printStyles.section}>
        <div style={printStyles.sectionTitle}>{t.planTitle}</div>
        <div style={printStyles.tiersContainer}>
          {tierDefs.map((tier, i) => {
            const rx = tiers[i];
            const activeDrugs = rx.drugs.filter(d => d.drug && d.dose && d.frequency);
            const printNote = getNote(rx.notes, lang);
            return (
              <div key={tier.number} style={{ ...printStyles.tierCard, borderColor: tier.borderColor, background: tier.lightColor }}>
                <div style={{ ...printStyles.tierBadge, background: tier.color }}>
                  {tier.icon} {tier.label}
                </div>
                <div style={printStyles.tierBody}>
                  <div style={printStyles.tierRow}>
                    <span style={printStyles.tierLabel}>{t.when}</span>
                    <span>{tier.trigger}</span>
                  </div>
                  <div style={printStyles.tierRow}>
                    <span style={printStyles.tierLabel}>{t.action}</span>
                    <span>{tier.action}</span>
                  </div>
                  <div style={{ ...printStyles.rxBox, borderColor: tier.color }}>
                    {activeDrugs.length > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                        {activeDrugs.map((d, idx) => (
                          <div key={idx} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ ...printStyles.drugBadge, background: tier.color }}>
                              {t.rxLabel(idx + 1)}
                            </span>
                            <span><strong>{MEDICATIONS[d.drug].label}</strong> {d.dose} — {d.frequency}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span style={{ color: "#9ca3af", fontStyle: "italic" }}>{t.noMed}</span>
                    )}
                  </div>
                  {printNote && (
                    <div style={printStyles.instructionsNote}>
                      <strong>{t.instructionsLabel}</strong> {printNote}
                    </div>
                  )}
                  {tier.escalate && (
                    <div style={printStyles.escalateNote}>↑ {tier.escalate}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={printStyles.divider} />

      <div style={printStyles.emergencyBox}>
        <strong>{t.emergency.title}</strong>
        <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: "4px 24px" }}>
          {t.emergency.items.map(s => <span key={s} style={{ fontSize: 12 }}>• {s}</span>)}
        </div>
      </div>

      <div style={printStyles.footer}>{t.footer}</div>
    </div>
  );
}

// ─── Language Toggle ─────────────────────────────────────────────────────────
function LangToggle({ lang, setLang }) {
  return (
    <div style={styles.langToggleWrap}>
      <span style={styles.langToggleLabel}>Handout Language:</span>
      <div style={styles.langToggleBtns}>
        <button
          onClick={() => setLang("en")}
          style={{ ...styles.langBtn, ...(lang === "en" ? styles.langBtnActive : {}) }}>
          🇺🇸 English
        </button>
        <button
          onClick={() => setLang("es")}
          style={{ ...styles.langBtn, ...(lang === "es" ? styles.langBtnActiveEs : {}) }}>
          🇲🇽 Español
        </button>
      </div>
    </div>
  );
}

// ─── Prescribe Tool ──────────────────────────────────────────────────────────
export default function PrescribeTool() {
  const [step, setStep] = useState(0);
  const [patient, setPatient] = useState("");
  const [physician, setPhysician] = useState("");
  const [date, setDate] = useState(new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }));
  const [tiers, setTiers] = useState([emptyTier(), emptyTier(), emptyTier()]);
  const [lang, setLang] = useState("en");

  const updateTier = (i, val) => { const next = [...tiers]; next[i] = val; setTiers(next); };
  const steps = ["Patient Info", "Prescribe Tiers", "Preview & Print"];
  const tierInfoEn = TIER_INFO.en;

  return (
    <>
      <style>{`
        button:hover { filter: brightness(0.93); }
        select:focus, input:focus, textarea:focus { outline: 2px solid #0f4c75; outline-offset: 1px; }
      `}</style>

      <div style={styles.shell}>
        {/* Top Bar */}
        <div style={styles.topBar}>
          <div style={styles.topBarInner}>
            <div style={styles.logo}>
              <span style={styles.logoHeart}>💊</span>
              <div>
                <div style={styles.logoTitle}>Diuretic Management Tool</div>
                <div style={styles.logoSub}>Physician prescribing · Bilingual patient handout</div>
              </div>
            </div>
            <div style={styles.stepIndicator}>
              {steps.map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ ...styles.stepDot, background: i <= step ? "#0f4c75" : "#cbd5e1" }}>
                    {i < step ? "✓" : i + 1}
                  </div>
                  <span style={{ ...styles.stepLabel, color: i === step ? "#bfdbfe" : "#64748b", fontWeight: i === step ? 600 : 400 }}>{s}</span>
                  {i < steps.length - 1 && <div style={styles.stepLine} />}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={styles.content}>
          {/* STEP 0 — Patient Info */}
          {step === 0 && (
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <div style={styles.cardTitle}>Patient Information</div>
                <div style={styles.cardSub}>Enter details for the printed handout. No information is stored.</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 18, marginTop: 24 }}>
                <div>
                  <label style={styles.fieldLabel}>Patient Name <span style={{ color: "#ef4444" }}>*</span></label>
                  <input type="text" style={styles.input} placeholder="e.g. Jane Smith" value={patient} onChange={(e) => setPatient(e.target.value)} />
                </div>
                <div>
                  <label style={styles.fieldLabel}>Prescribing Provider (optional)</label>
                  <input type="text" style={styles.input} placeholder="e.g. Dr. Rodriguez, MD" value={physician} onChange={(e) => setPhysician(e.target.value)} />
                </div>
                <div>
                  <label style={styles.fieldLabel}>Date</label>
                  <input type="text" style={styles.input} value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
              </div>
              <div style={styles.actions}>
                <button style={{ ...styles.btnPrimary, opacity: patient.trim() ? 1 : 0.4 }} disabled={!patient.trim()} onClick={() => setStep(1)}>
                  Next: Prescribe Medications →
                </button>
              </div>
            </div>
          )}

          {/* STEP 1 — Tier Prescriptions */}
          {step === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={styles.infoBar}>
                <strong>Prescribing for:</strong> {patient} &nbsp;·&nbsp; {date}
                <button style={styles.editInfoBtn} onClick={() => setStep(0)}>Edit info</button>
              </div>
              {tierInfoEn.map((tier, i) => (
                <TierEditor key={i} tierInfo={tier} value={tiers[i]} onChange={(v) => updateTier(i, v)} />
              ))}
              <div style={styles.actions}>
                <button style={styles.btnSecondary} onClick={() => setStep(0)}>← Back</button>
                <button style={styles.btnPrimary} onClick={() => setStep(2)}>Preview Handout →</button>
              </div>
            </div>
          )}

          {/* STEP 2 — Preview & Print */}
          {step === 2 && (
            <div>
              <div style={styles.previewToolbar}>
                <button style={styles.btnSecondary} onClick={() => setStep(1)}>← Edit Prescriptions</button>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <LangToggle lang={lang} setLang={setLang} />
                  <button style={styles.btnPrint} onClick={() => window.print()}>
                    🖨 {lang === "es" ? "Imprimir Hoja del Paciente" : "Print Patient Handout"}
                  </button>
                </div>
              </div>
              <div style={styles.previewWrapper}>
                <PrintView patient={patient} date={date} physician={physician} tiers={tiers} lang={lang} />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = {
  shell: { minHeight: "100vh", background: "#eef2f7", fontFamily: "'DM Sans', sans-serif" },
  topBar: { background: "#0f4c75", color: "white", padding: "0 24px", boxShadow: "0 2px 12px rgba(0,0,0,0.2)" },
  topBarInner: { maxWidth: 920, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0", flexWrap: "wrap", gap: 12 },
  logo: { display: "flex", alignItems: "center", gap: 10 },
  logoHeart: { fontSize: 28, color: "#f87171" },
  logoTitle: { fontSize: 16, fontWeight: 700 },
  logoSub: { fontSize: 11, color: "#93c5fd", letterSpacing: 0.5 },
  stepIndicator: { display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" },
  stepDot: { width: 26, height: 26, borderRadius: "50%", color: "white", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" },
  stepLabel: { fontSize: 12 },
  stepLine: { width: 20, height: 1, background: "#334e68" },
  content: { maxWidth: 880, margin: "30px auto", padding: "0 20px 60px" },
  card: { background: "white", borderRadius: 12, padding: "24px 28px", boxShadow: "0 1px 4px rgba(0,0,0,0.07), 0 4px 16px rgba(0,0,0,0.05)" },
  cardHeader: { borderBottom: "1px solid #e5e7eb", paddingBottom: 14 },
  cardTitle: { fontSize: 20, fontWeight: 700, color: "#0f4c75", fontFamily: "'Libre Baskerville', serif" },
  cardSub: { fontSize: 13, color: "#6b7280", marginTop: 4 },
  fieldLabel: { display: "block", fontSize: 11, fontWeight: 600, color: "#374151", letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 5 },
  input: { width: "100%", padding: "10px 14px", border: "1.5px solid #d1d5db", borderRadius: 8, fontSize: 14, fontFamily: "'DM Sans', sans-serif", color: "#111827", background: "#fafafa" },
  select: { width: "100%", padding: "9px 10px", border: "1.5px solid #d1d5db", borderRadius: 8, fontSize: 13, fontFamily: "'DM Sans', sans-serif", color: "#111827", background: "#fafafa", cursor: "pointer" },
  textarea: { width: "100%", padding: "9px 12px", border: "1.5px solid #d1d5db", borderRadius: 8, fontSize: 13, fontFamily: "'DM Sans', sans-serif", color: "#111827", background: "#fafafa", resize: "vertical", lineHeight: 1.5 },
  actions: { marginTop: 24, display: "flex", justifyContent: "flex-end", gap: 12 },
  btnPrimary: { background: "#0f4c75", color: "white", border: "none", borderRadius: 8, padding: "11px 24px", fontSize: 14, fontWeight: 600, cursor: "pointer" },
  btnSecondary: { background: "white", color: "#374151", border: "1.5px solid #d1d5db", borderRadius: 8, padding: "10px 20px", fontSize: 14, cursor: "pointer" },
  btnPrint: { background: "#1a7a4a", color: "white", border: "none", borderRadius: 8, padding: "11px 24px", fontSize: 14, fontWeight: 600, cursor: "pointer" },
  tierPill: { color: "white", fontSize: 13, fontWeight: 700, padding: "4px 14px", borderRadius: 20 },
  addMedBtn: { marginTop: 12, background: "#f1f5f9", border: "1.5px dashed #94a3b8", borderRadius: 8, padding: "7px 16px", fontSize: 12, fontWeight: 600, color: "#475569", cursor: "pointer", width: "100%" },
  removBtn: { background: "#fee2e2", border: "none", color: "#b91c1c", borderRadius: 6, width: 28, height: 28, cursor: "pointer", fontSize: 12, fontWeight: 700, flexShrink: 0, alignSelf: "flex-end", marginBottom: 1 },
  indexBadge: { width: 24, height: 24, borderRadius: "50%", background: "#e2e8f0", fontSize: 11, fontWeight: 700, color: "#475569", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, alignSelf: "flex-end", marginBottom: 2 },
  drugHint: { fontSize: 11, color: "#6b7280", fontStyle: "italic", marginBottom: 4, marginLeft: 32 },
  hintBox: { marginTop: 10, background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 6, padding: "7px 12px", fontSize: 12, color: "#92400e" },
  infoBar: { background: "#dbeafe", border: "1px solid #93c5fd", borderRadius: 8, padding: "10px 16px", fontSize: 13, color: "#1e3a5f", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
  editInfoBtn: { background: "none", border: "none", color: "#0f4c75", fontSize: 12, cursor: "pointer", textDecoration: "underline", marginLeft: "auto" },
  previewWrapper: { background: "white", borderRadius: 12, boxShadow: "0 2px 20px rgba(0,0,0,0.1)", overflow: "hidden" },
  previewToolbar: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 },
  langToggleWrap: { display: "flex", alignItems: "center", gap: 10, background: "white", border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "6px 12px" },
  langToggleLabel: { fontSize: 12, fontWeight: 600, color: "#374151", whiteSpace: "nowrap" },
  langToggleBtns: { display: "flex", gap: 4 },
  langBtn: { padding: "5px 14px", borderRadius: 7, border: "1.5px solid #e2e8f0", background: "#f8fafc", fontSize: 13, cursor: "pointer", fontWeight: 500, color: "#6b7280", transition: "all 0.15s" },
  langBtnActive: { background: "#0f4c75", color: "white", border: "1.5px solid #0f4c75", fontWeight: 700 },
  langBtnActiveEs: { background: "#b91c1c", color: "white", border: "1.5px solid #b91c1c", fontWeight: 700 },
};

const printStyles = {
  page: { padding: "28px 38px", fontFamily: "'DM Sans', sans-serif", color: "#111827", maxWidth: 760, margin: "0 auto", fontSize: 12.5 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 },
  clinicName: { fontFamily: "'Libre Baskerville', serif", fontSize: 22, fontWeight: 700, color: "#0f4c75" },
  clinicSub: { fontSize: 12, color: "#1a7a4a", fontWeight: 600, marginTop: 2, letterSpacing: 0.4 },
  patientName: { fontSize: 18, fontWeight: 700, color: "#111827" },
  meta: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  divider: { height: 2, background: "linear-gradient(to right, #0f4c75, #1a7a4a, #e5e7eb)", margin: "14px 0" },
  section: { marginBottom: 18 },
  sectionTitle: { fontSize: 13, fontWeight: 700, color: "#0f4c75", letterSpacing: 0.5, marginBottom: 10, textTransform: "uppercase" },
  instructionGrid: { display: "flex", flexDirection: "column", gap: 7 },
  instructionCard: { display: "flex", gap: 10, alignItems: "flex-start", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 7, padding: "8px 12px" },
  instructionIcon: { fontSize: 20, lineHeight: 1, flexShrink: 0 },
  instructionText: { fontSize: 12, color: "#374151", marginTop: 2, lineHeight: 1.5 },
  tiersContainer: { display: "flex", flexDirection: "column", gap: 10 },
  tierCard: { border: "2px solid", borderRadius: 8, overflow: "hidden" },
  tierBadge: { padding: "6px 14px", color: "white", fontWeight: 700, fontSize: 13, letterSpacing: 0.3 },
  tierBody: { padding: "10px 14px", display: "flex", flexDirection: "column", gap: 6 },
  tierRow: { display: "flex", gap: 8, fontSize: 12, lineHeight: 1.5 },
  tierLabel: { fontWeight: 700, minWidth: 60, color: "#374151", flexShrink: 0 },
  rxBox: { marginTop: 2, padding: "8px 12px", background: "white", borderRadius: 6, border: "1.5px solid", fontSize: 13 },
  drugBadge: { color: "white", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10, flexShrink: 0 },
  instructionsNote: { background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 5, padding: "6px 10px", fontSize: 12, color: "#14532d", lineHeight: 1.5 },
  escalateNote: { fontSize: 11.5, color: "#92400e", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 4, padding: "5px 10px" },
  emergencyBox: { background: "#fff1f2", border: "2px solid #fca5a5", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 12.5 },
  footer: { fontSize: 11, color: "#9ca3af", textAlign: "center", marginTop: 14, fontStyle: "italic", borderTop: "1px solid #e5e7eb", paddingTop: 10 },
};
