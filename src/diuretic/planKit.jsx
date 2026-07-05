// ─── Diuretic Plan Kit ───────────────────────────────────────────────────────
// Shared building blocks for the diuretic regimen, used by:
//   • the physician dashboard  — create/edit a patient's plan (DiureticPlanEditor)
//   • the printed handout       — PrintView (+ QR that references the patient code)
//   • the QR target / patient   — PatientPlanView loads the plan from the record
// The plan lives ON the patient record (patients.diuretic_plan), keyed by the
// pseudonymous HF-XXXX code — no patient name is stored anywhere.
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { DB } from "../db";

export const MEDICATIONS = {
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
export const T = {
  en: {
    clinicName: "Heart Failure Clinic",
    clinicSub: "Personalized Diuretic Self-Management Plan",
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
    codeLabel: "Code:",
    dateLabel: "Date:",
    providerLabel: "Provider:",
  },
  es: {
    clinicName: "Clínica de Insuficiencia Cardíaca",
    clinicSub: "Plan Personalizado de Autocontrol con Diuréticos",
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
    codeLabel: "Código:",
    dateLabel: "Fecha:",
    providerLabel: "Médico:",
  },
};

export const TIER_INFO = {
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
    { label: "Select a template or type below…", labelEs: "Seleccione una plantilla o escriba abajo…", value: "" },
    { label: "Metolazone → loop diuretic sequence", labelEs: "Metolazona → secuencia con diurético de asa", value: "Take Metolazone first. Wait 30 minutes, then take your Bumetanide or Torsemide. This sequence makes both medications more effective." },
    { label: "Morning only — avoid evening dose", labelEs: "Solo por la mañana — evitar dosis nocturna", value: "Take all medications in the morning to avoid nighttime urination. Do not take after noon." },
    { label: "Take with potassium supplement", labelEs: "Tomar con suplemento de potasio", value: "Take your diuretic with a potassium supplement as directed. This helps prevent low potassium levels." },
    { label: "Monitor electrolytes in 3–5 days", labelEs: "Controlar electrolitos en 3–5 días", value: "Get a blood electrolyte check within 3–5 days of starting this regimen. Call the office with your results." },
  ],
  2: [
    { label: "Select a template or type below…", labelEs: "Seleccione una plantilla o escriba abajo…", value: "" },
    { label: "Metolazone + loop diuretic sequence (Tier 2)", labelEs: "Metolazona + diurético de asa (Nivel 2)", value: "Take Metolazone first. Wait 30 minutes, then take your Bumetanide or Torsemide. This combination is powerful — expect significantly increased urination for several hours." },
    { label: "Add to Tier 1 — do not stop Tier 1", labelEs: "Agregar al Nivel 1 — no suspender el Nivel 1", value: "Take this medication IN ADDITION to your Tier 1 medications. Do not stop your Tier 1 regimen. Continue both until your weight returns to baseline." },
    { label: "Single extra dose, then recheck weight", labelEs: "Una dosis extra, luego volver a pesarse", value: "Take this as one extra dose today. Recheck your weight tomorrow morning. If your weight is still rising, move to Tier 3 and call the office." },
    { label: "Urgent electrolyte check within 48–72 hrs", labelEs: "Control urgente de electrolitos en 48–72 h", value: "Get a blood electrolyte check within 48–72 hours of taking this dose. Call the office with your results so we can monitor your kidney function." },
  ],
  3: [
    { label: "Select a template or type below…", labelEs: "Seleccione una plantilla o escriba abajo…", value: "" },
    { label: "Start SC + continue orals + call office now", labelEs: "Iniciar SC + continuar orales + llamar ahora", value: "Start your Furosemide SC and continue taking your other oral diuretics as usual. Call the cardiology office immediately to notify us you have reached this level. Do not wait." },
    { label: "SC infusion + call office right away", labelEs: "Infusión SC + llamar de inmediato", value: "Begin the Furosemide SC infusion as instructed. Call the office right away — we will guide your next steps or arrange an urgent clinic visit." },
    { label: "All medications + urgent call", labelEs: "Todos los medicamentos + llamada urgente", value: "Take all three medications as listed in order. Call your cardiologist's office immediately. If you cannot reach us within 30 minutes, go to the nearest emergency room." },
    { label: "Emergency escalation — 911 if severe symptoms", labelEs: "Escalada de emergencia — 911 si síntomas graves", value: "This is an urgent situation. Take your medications and call the office NOW. If you feel short of breath at rest, have chest pain, or cannot lie flat — call 911 immediately. Do not drive yourself." },
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

// Spanish versions of the predefined frequency options for the printed handout.
const FREQ_ES = {
  "once daily": "una vez al día",
  "twice daily": "dos veces al día",
  "three times daily": "tres veces al día",
  "once": "una vez",
  "30 min before loop diuretic": "30 min antes del diurético de asa",
  "over 4 hours SC infusion": "en infusión SC durante 4 horas",
  "every other day": "un día sí y un día no",
  "every third day": "cada tres días",
  "Monday-Wednesday-Friday": "lunes, miércoles y viernes",
};

const getFreq = (freq, lang) => {
  if (lang === "en" || !freq) return freq;
  return FREQ_ES[freq] || freq;
};

const COMMON_FREQUENCIES = ["every other day", "every third day", "Monday-Wednesday-Friday"];
const OTHER = "__other__";

const drugDisplayName = (d) => (d.drug === OTHER ? d.drugName : MEDICATIONS[d.drug]?.label) || "";

export const emptyDrug = () => ({ drug: "", dose: "", frequency: "", drugName: "", doseOther: false, freqOther: false });
export const emptyTier = () => ({ drugs: [emptyDrug()], notes: { en: "", es: "" }, notesPreset: "" });
export const emptyPlan = () => ({
  physician: "Sandra Benelli ARNP / Dr. José Luis Velázquez C.",
  date: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
  tiers: [emptyTier(), emptyTier(), emptyTier()],
});

// True when a plan actually has at least one complete drug row somewhere.
export const planHasContent = (plan) =>
  !!plan?.tiers?.some((t) => t.drugs?.some((d) => drugDisplayName(d) && d.dose && d.frequency));

// ─── Reference QR ─────────────────────────────────────────────────────────────
// The QR points at the patient's record (#/plan/HF-XXXX), so it always renders the
// CURRENT regimen and carries no name — the code is the only identifier.
export const buildPlanUrl = (code) =>
  `${window.location.origin}${window.location.pathname}#/plan/${code}`;

// ─── SingleMedRow ────────────────────────────────────────────────────────────
function SingleMedRow({ value, onChange, onRemove, showRemove, index, showLabels }) {
  const isCustomMed = value.drug === OTHER;
  const selected = !isCustomMed && value.drug ? MEDICATIONS[value.drug] : null;
  const doseActive = !!selected || isCustomMed;
  const freqList = isCustomMed
    ? COMMON_FREQUENCIES
    : selected
      ? [...COMMON_FREQUENCIES, ...selected.frequency.filter((f) => !COMMON_FREQUENCIES.includes(f))]
      : [];

  const handleDrug = (e) =>
    onChange({ drug: e.target.value, drugName: "", dose: "", frequency: "", doseOther: false, freqOther: false });
  const handleDose = (e) => {
    const v = e.target.value;
    if (v === OTHER) onChange({ ...value, doseOther: true, dose: "" });
    else onChange({ ...value, doseOther: false, dose: v });
  };
  const handleFreq = (e) => {
    const v = e.target.value;
    if (v === OTHER) onChange({ ...value, freqOther: true, frequency: "" });
    else onChange({ ...value, freqOther: false, frequency: v });
  };

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
      <div style={styles.indexBadge}>{index + 1}</div>
      <div style={{ flex: "1 1 170px" }}>
        {showLabels && <label style={styles.fieldLabel}>Medication</label>}
        <select style={styles.select} value={value.drug} onChange={handleDrug}>
          <option value="">— Select drug —</option>
          {Object.entries(MEDICATIONS).map(([key, med]) => (
            <option key={key} value={key}>{med.label}</option>
          ))}
          <option value={OTHER}>Other…</option>
        </select>
        {isCustomMed && (
          <input style={{ ...styles.select, marginTop: 6 }} type="text" placeholder="Medication name"
            value={value.drugName || ""} onChange={(e) => onChange({ ...value, drugName: e.target.value })} />
        )}
      </div>
      <div style={{ flex: "1 1 110px" }}>
        {showLabels && <label style={styles.fieldLabel}>Dose</label>}
        {isCustomMed ? (
          <input style={styles.select} type="text" placeholder="Dose (e.g. 25 mg)"
            value={value.dose} onChange={(e) => onChange({ ...value, dose: e.target.value })} />
        ) : (
          <>
            <select style={{ ...styles.select, opacity: doseActive ? 1 : 0.45 }}
              value={value.doseOther ? OTHER : value.dose} disabled={!doseActive} onChange={handleDose}>
              <option value="">— Dose —</option>
              {selected && selected.doses.map((d) => <option key={d} value={d}>{d}</option>)}
              {selected && <option value={OTHER}>Other…</option>}
            </select>
            {value.doseOther && (
              <input style={{ ...styles.select, marginTop: 6 }} type="text" placeholder="Custom dose"
                value={value.dose} onChange={(e) => onChange({ ...value, dose: e.target.value })} />
            )}
          </>
        )}
      </div>
      <div style={{ flex: "1 1 160px" }}>
        {showLabels && <label style={styles.fieldLabel}>Frequency</label>}
        <select style={{ ...styles.select, opacity: doseActive ? 1 : 0.45 }}
          value={value.freqOther ? OTHER : value.frequency} disabled={!doseActive} onChange={handleFreq}>
          <option value="">— Frequency —</option>
          {freqList.map((f) => <option key={f} value={f}>{f}</option>)}
          {doseActive && <option value={OTHER}>Other…</option>}
        </select>
        {value.freqOther && (
          <input style={{ ...styles.select, marginTop: 6 }} type="text" placeholder="Custom frequency"
            value={value.frequency} onChange={(e) => onChange({ ...value, frequency: e.target.value })} />
        )}
      </div>
      {showRemove
        ? <button onClick={onRemove} style={styles.removBtn} title="Remove">✕</button>
        : <div style={{ width: 28 }} />}
    </div>
  );
}

// ─── TierEditor ──────────────────────────────────────────────────────────────
export function TierEditor({ tierInfo, value, onChange, lang }) {
  const { drugs, notes, notesPreset } = value;
  const presets = PRESET_NOTES[tierInfo.number];

  const updateDrug = (i, v) => { const next = [...drugs]; next[i] = v; onChange({ ...value, drugs: next }); };
  const addDrug = () => { if (drugs.length < tierInfo.maxMeds) onChange({ ...value, drugs: [...drugs, emptyDrug()] }); };
  const removeDrug = (i) => onChange({ ...value, drugs: drugs.filter((_, idx) => idx !== i) });
  const handlePreset = (e) => {
    const en = e.target.value;
    const es = NOTES_ES[en] || en;
    onChange({ ...value, notesPreset: en, notes: { en, es } });
  };
  const editNote = (e) => onChange({ ...value, notes: { ...notes, [lang]: e.target.value }, notesPreset: "" });
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
        <label style={styles.fieldLabel}>
          {lang === "es" ? "Instrucciones para el Paciente (Español)" : "Patient Instructions (English)"}
        </label>
        <select style={{ ...styles.select, marginBottom: 8 }} value={notesPreset} onChange={handlePreset}>
          {presets.map((p) => (
            <option key={p.value || "placeholder"} value={p.value}>
              {lang === "es" ? (p.labelEs || p.label) : p.label}
            </option>
          ))}
        </select>
        <textarea style={styles.textarea} rows={3}
          placeholder={lang === "es"
            ? "Seleccione una plantilla arriba, o escriba instrucciones personalizadas aquí…"
            : "Select a template above, or type custom instructions here…"}
          value={notes[lang]}
          onChange={editNote} />
      </div>
    </div>
  );
}

// ─── Language Toggle ─────────────────────────────────────────────────────────
export function LangToggle({ lang, setLang }) {
  return (
    <div style={styles.langToggleWrap}>
      <span style={styles.langToggleLabel}>Handout Language:</span>
      <div style={styles.langToggleBtns}>
        <button onClick={() => setLang("en")}
          style={{ ...styles.langBtn, ...(lang === "en" ? styles.langBtnActive : {}) }}>
          🇺🇸 English
        </button>
        <button onClick={() => setLang("es")}
          style={{ ...styles.langBtn, ...(lang === "es" ? styles.langBtnActiveEs : {}) }}>
          🇲🇽 Español
        </button>
      </div>
    </div>
  );
}

// ─── DiureticPlanEditor ──────────────────────────────────────────────────────
// The full 3-tier regimen editor, reused by the physician dashboard for both
// creating a new patient's plan and editing an existing one. `value` is a plan
// object ({ physician, date, tiers }); `onChange` receives the updated plan.
export function DiureticPlanEditor({ value, onChange }) {
  const [editLang, setEditLang] = useState("en");
  const updateTier = (i, v) => { const next = [...value.tiers]; next[i] = v; onChange({ ...value, tiers: next }); };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 240px" }}>
          <label style={styles.fieldLabel}>Prescribing Provider</label>
          <input type="text" style={styles.select} value={value.physician}
            onChange={(e) => onChange({ ...value, physician: e.target.value })} />
        </div>
        <div style={{ flex: "1 1 140px" }}>
          <label style={styles.fieldLabel}>Date</label>
          <input type="text" style={styles.select} value={value.date}
            onChange={(e) => onChange({ ...value, date: e.target.value })} />
        </div>
      </div>
      <div style={styles.langBar}>
        <span style={{ fontSize: 12, color: "#475569" }}>
          Patient-instruction language — edit each template in the language it will print:
        </span>
        <LangToggle lang={editLang} setLang={setEditLang} />
      </div>
      {TIER_INFO.en.map((tier, i) => (
        <TierEditor key={i} tierInfo={tier} value={value.tiers[i]} onChange={(v) => updateTier(i, v)} lang={editLang} />
      ))}
    </div>
  );
}

// ─── PrintView ───────────────────────────────────────────────────────────────
// The printable bilingual handout. Identified by the pseudonymous `code`
// (no patient name). `planUrl` renders the reference QR when provided.
export function PrintView({ code, date, physician, tiers, lang, planUrl }) {
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
          {code && <div style={printStyles.patientCode}>{t.codeLabel} {code}</div>}
          <div style={printStyles.meta}>{t.dateLabel} {date}</div>
          {physician && <div style={printStyles.meta}>{t.providerLabel} {physician}</div>}
        </div>
      </div>

      <div style={printStyles.divider} />

      {/* Tier plan */}
      <div style={printStyles.section}>
        <div style={printStyles.sectionTitle}>{t.planTitle}</div>
        <div style={printStyles.tiersContainer}>
          {tierDefs.map((tier, i) => {
            const rx = tiers[i];
            const activeDrugs = rx.drugs.filter(d => drugDisplayName(d) && d.dose && d.frequency);
            const printNote = rx.notes?.[lang];
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
                            <span><strong>{drugDisplayName(d)}</strong> {d.dose} — {getFreq(d.frequency, lang)}</span>
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

      {planUrl && (
        <div style={printStyles.qrRow}>
          <div style={printStyles.qrBox}>
            <QRCodeSVG value={planUrl} size={92} level="L" marginSize={0} />
          </div>
          <div style={printStyles.qrCaption}>
            <strong>
              {lang === "es" ? "📱 Lleve este plan en su teléfono" : "📱 Take this plan on your phone"}
            </strong>
            <div style={{ marginTop: 2 }}>
              {lang === "es"
                ? "Escanee este código con la cámara de su teléfono para abrir y guardar su plan."
                : "Scan this code with your phone camera to open and save your plan."}
            </div>
          </div>
        </div>
      )}

      <div style={printStyles.footer}>{t.footer}</div>
    </div>
  );
}

// Scale the handout so it always fits on a single US Letter sheet before printing.
export function printHandout() {
  const el = document.getElementById("print-area");
  if (el) {
    const DPI = 96;
    const printableHeight = 10 * DPI; // Letter 11in − 2 × 0.5in margin
    const prevWidth = el.style.width;
    const prevPadding = el.style.padding;
    el.style.width = "7.5in";
    el.style.padding = "0";
    const contentHeight = el.scrollHeight;
    el.style.width = prevWidth;
    el.style.padding = prevPadding;
    const scale = Math.min(1, printableHeight / contentHeight);
    document.documentElement.style.setProperty("--print-scale", String(scale));
  }
  window.print();
}

// ─── Patient Plan View (opened by scanning the QR code) ──────────────────────
// Loads the plan from the patient's record by code (#/plan/HF-XXXX).
export function PatientPlanView() {
  const { code } = useParams();
  const [record, setRecord] = useState(undefined); // undefined = loading, null = not found
  const [lang, setLang] = useState("en");

  useEffect(() => {
    let alive = true;
    const id = (code || "").trim().toUpperCase();
    DB.get(`hf_pt_${id}`).then((r) => { if (alive) setRecord(r || null); });
    return () => { alive = false; };
  }, [code]);

  if (record === undefined) {
    return (
      <div style={styles.planViewShell}>
        <div style={styles.planViewCard}>
          <p style={{ padding: 24, textAlign: "center", color: "#6b7280" }}>Loading your plan…</p>
        </div>
      </div>
    );
  }

  if (!record || !record.diureticPlan || !planHasContent(record.diureticPlan)) {
    return (
      <div style={styles.planViewShell}>
        <div style={styles.planViewCard}>
          <p style={{ padding: 24, textAlign: "center", color: "#6b7280" }}>
            No diuretic plan is on file for this code yet. Please ask your clinic.
          </p>
        </div>
      </div>
    );
  }

  const plan = record.diureticPlan;
  return (
    <div style={styles.planViewShell}>
      <div style={styles.planViewBar}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#0f4c75" }}>
          {lang === "es" ? "Su Plan de Diuréticos" : "Your Diuretic Plan"}
        </span>
        <LangToggle lang={lang} setLang={setLang} />
      </div>
      <div style={styles.planViewCard}>
        <PrintView code={record.id} date={plan.date} physician={plan.physician} tiers={plan.tiers} lang={lang} />
      </div>
      <div style={styles.planViewHint}>
        {lang === "es"
          ? "💾 Guarde esta página o tome una captura de pantalla para tenerla siempre a mano."
          : "💾 Save this page or take a screenshot so you always have it handy."}
      </div>
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
export const styles = {
  card: { background: "white", borderRadius: 12, padding: "24px 28px", boxShadow: "0 1px 4px rgba(0,0,0,0.07), 0 4px 16px rgba(0,0,0,0.05)" },
  fieldLabel: { display: "block", fontSize: 11, fontWeight: 600, color: "#374151", letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 5 },
  select: { width: "100%", padding: "9px 10px", border: "1.5px solid #d1d5db", borderRadius: 8, fontSize: 13, fontFamily: "'DM Sans', sans-serif", color: "#111827", background: "#fafafa", cursor: "pointer" },
  textarea: { width: "100%", padding: "9px 12px", border: "1.5px solid #d1d5db", borderRadius: 8, fontSize: 13, fontFamily: "'DM Sans', sans-serif", color: "#111827", background: "#fafafa", resize: "vertical", lineHeight: 1.5 },
  tierPill: { color: "white", fontSize: 13, fontWeight: 700, padding: "4px 14px", borderRadius: 20 },
  addMedBtn: { marginTop: 12, background: "#f1f5f9", border: "1.5px dashed #94a3b8", borderRadius: 8, padding: "7px 16px", fontSize: 12, fontWeight: 600, color: "#475569", cursor: "pointer", width: "100%" },
  removBtn: { background: "#fee2e2", border: "none", color: "#b91c1c", borderRadius: 6, width: 28, height: 28, cursor: "pointer", fontSize: 12, fontWeight: 700, flexShrink: 0, alignSelf: "flex-end", marginBottom: 1 },
  indexBadge: { width: 24, height: 24, borderRadius: "50%", background: "#e2e8f0", fontSize: 11, fontWeight: 700, color: "#475569", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, alignSelf: "flex-end", marginBottom: 2 },
  drugHint: { fontSize: 11, color: "#6b7280", fontStyle: "italic", marginBottom: 4, marginLeft: 32 },
  hintBox: { marginTop: 10, background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 6, padding: "7px 12px", fontSize: 12, color: "#92400e" },
  langBar: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 14px" },
  langToggleWrap: { display: "flex", alignItems: "center", gap: 10, background: "white", border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "6px 12px" },
  langToggleLabel: { fontSize: 12, fontWeight: 600, color: "#374151", whiteSpace: "nowrap" },
  langToggleBtns: { display: "flex", gap: 4 },
  langBtn: { padding: "5px 14px", borderRadius: 7, border: "1.5px solid #e2e8f0", background: "#f8fafc", fontSize: 13, cursor: "pointer", fontWeight: 500, color: "#6b7280", transition: "all 0.15s" },
  langBtnActive: { background: "#0f4c75", color: "white", border: "1.5px solid #0f4c75", fontWeight: 700 },
  langBtnActiveEs: { background: "#b91c1c", color: "white", border: "1.5px solid #b91c1c", fontWeight: 700 },
  planViewShell: { minHeight: "100vh", background: "#eef2f7", fontFamily: "'DM Sans', sans-serif", padding: "12px 10px 40px" },
  planViewBar: { maxWidth: 760, margin: "0 auto 12px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" },
  planViewCard: { maxWidth: 760, margin: "0 auto", background: "white", borderRadius: 12, boxShadow: "0 2px 20px rgba(0,0,0,0.1)", overflow: "hidden" },
  planViewHint: { maxWidth: 760, margin: "12px auto 0", textAlign: "center", fontSize: 13, color: "#475569" },
};

const printStyles = {
  page: { padding: "28px 38px", fontFamily: "'DM Sans', sans-serif", color: "#111827", maxWidth: 760, margin: "0 auto", fontSize: 12.5 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 },
  clinicName: { fontFamily: "'Libre Baskerville', serif", fontSize: 22, fontWeight: 700, color: "#0f4c75" },
  clinicSub: { fontSize: 12, color: "#1a7a4a", fontWeight: 600, marginTop: 2, letterSpacing: 0.4 },
  patientCode: { fontSize: 18, fontWeight: 700, color: "#111827", fontFamily: "monospace", letterSpacing: 1 },
  meta: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  divider: { height: 2, background: "linear-gradient(to right, #0f4c75, #1a7a4a, #e5e7eb)", margin: "14px 0" },
  section: { marginBottom: 18 },
  sectionTitle: { fontSize: 13, fontWeight: 700, color: "#0f4c75", letterSpacing: 0.5, marginBottom: 10, textTransform: "uppercase" },
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
  qrRow: { display: "flex", alignItems: "center", gap: 14, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 14px", marginBottom: 6 },
  qrBox: { background: "white", padding: 5, borderRadius: 6, border: "1px solid #e2e8f0", lineHeight: 0, flexShrink: 0 },
  qrCaption: { fontSize: 12, color: "#374151", lineHeight: 1.45 },
  footer: { fontSize: 11, color: "#9ca3af", textAlign: "center", marginTop: 14, fontStyle: "italic", borderTop: "1px solid #e5e7eb", paddingTop: 10 },
};
