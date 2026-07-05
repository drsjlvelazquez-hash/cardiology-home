import { Link } from "react-router-dom";

const T = {
  en: {
    welcome: "Welcome to Your Heart Failure Clinic",
    intro:
      "Simple tools to help you and your care team keep your heart failure under control.",
    patientTitle: "Patient Weight Monitor",
    patientDesc:
      "Track your daily weight from home using the private code your clinic gave you. See your progress on a chart and get guidance on which step of your plan to follow.",
    patientBtn: "I'm a Patient →",
    physicianSection: "Physician Tools",
    dashTitle: "Patient Dashboard",
    dashDesc:
      "Register patients, set each patient's baseline and 3-tier diuretic plan, review weight trends, and send alerts. PIN required.",
    dashBtn: "Open Dashboard",
    forPatients: "For Patients",
    forProviders: "For Providers",
  },
  es: {
    welcome: "Bienvenido a Su Clínica de Insuficiencia Cardíaca",
    intro:
      "Herramientas sencillas para ayudarle a usted y a su equipo médico a mantener su insuficiencia cardíaca bajo control.",
    patientTitle: "Monitor de Peso del Paciente",
    patientDesc:
      "Registre su peso diario desde casa usando el código privado que le dio su clínica. Vea su progreso en una gráfica y reciba orientación sobre qué paso de su plan seguir.",
    patientBtn: "Soy Paciente →",
    physicianSection: "Herramientas para Médicos",
    dashTitle: "Panel de Pacientes",
    dashDesc:
      "Registre pacientes, defina el peso base y el plan de diuréticos de 3 niveles de cada paciente, revise tendencias de peso y envíe alertas. Requiere PIN.",
    dashBtn: "Abrir Panel",
    forPatients: "Para Pacientes",
    forProviders: "Para Médicos",
  },
};

export default function Home({ lang }) {
  const t = T[lang];

  return (
    <div style={s.page}>
      <div style={s.wrap}>
        <div style={s.hero}>
          <div style={s.heroIcon}>♥</div>
          <h1 style={s.heroTitle}>{t.welcome}</h1>
          <p style={s.heroSub}>{t.intro}</p>
        </div>

        <div style={s.sectionLabel}>{t.forPatients}</div>
        <Link to="/patient" style={{ ...s.card, ...s.patientCard }}>
          <div style={s.cardIcon}>⚖️</div>
          <div style={{ flex: 1 }}>
            <div style={{ ...s.cardTitle, color: "#1e3a8a" }}>
              {t.patientTitle}
            </div>
            <div style={s.cardDesc}>{t.patientDesc}</div>
          </div>
          <span style={{ ...s.cardBtn, background: "#1e3a8a" }}>
            {t.patientBtn}
          </span>
        </Link>

        <div style={s.sectionLabel}>{t.forProviders}</div>
        <div style={s.providerGrid}>
          <Link to="/physician" style={s.card}>
            <div style={s.cardIcon}>🩺</div>
            <div style={{ flex: 1 }}>
              <div style={{ ...s.cardTitle, color: "#1a7a4a" }}>
                {t.dashTitle}
              </div>
              <div style={s.cardDesc}>{t.dashDesc}</div>
            </div>
            <span style={{ ...s.cardBtn, background: "#1a7a4a" }}>
              🔒 {t.dashBtn}
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}

const s = {
  page: {
    minHeight: "calc(100vh - 110px)",
    background:
      "linear-gradient(160deg, #e8f0fe 0%, #f0f6ff 60%, #fef9ee 100%)",
    padding: "40px 20px 60px",
  },
  wrap: { maxWidth: 860, margin: "0 auto" },
  hero: { textAlign: "center", marginBottom: 36 },
  heroIcon: {
    fontSize: 46,
    color: "#ef4444",
    marginBottom: 8,
    filter: "drop-shadow(0 2px 8px rgba(239,68,68,0.3))",
  },
  heroTitle: {
    fontFamily: "'Lora', serif",
    fontSize: 28,
    fontWeight: 700,
    color: "#1e3a8a",
    marginBottom: 10,
  },
  heroSub: {
    fontSize: 15,
    color: "#475569",
    maxWidth: 560,
    margin: "0 auto",
    lineHeight: 1.6,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: 800,
    color: "#64748b",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    margin: "26px 0 10px",
  },
  card: {
    display: "flex",
    alignItems: "center",
    gap: 18,
    background: "white",
    borderRadius: 16,
    padding: "22px 24px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.06), 0 6px 20px rgba(0,0,0,0.05)",
    textDecoration: "none",
    border: "1.5px solid #e2e8f0",
    flexWrap: "wrap",
  },
  patientCard: { border: "2px solid #bfdbfe" },
  providerGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: 14,
  },
  cardIcon: { fontSize: 36, flexShrink: 0 },
  cardTitle: {
    fontFamily: "'Lora', serif",
    fontSize: 17,
    fontWeight: 700,
    marginBottom: 6,
  },
  cardDesc: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 1.6,
    minWidth: 200,
  },
  cardBtn: {
    color: "white",
    borderRadius: 9,
    padding: "10px 18px",
    fontSize: 13,
    fontWeight: 700,
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
};
