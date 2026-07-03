import { Link, useLocation } from "react-router-dom";

const T = {
  en: {
    clinic: "Heart Failure Clinic",
    tagline: "Patient care · Weight monitoring · Diuretic management",
    home: "Home",
    emergency:
      "If you feel short of breath at rest or have chest pain → Call 911",
  },
  es: {
    clinic: "Clínica de Insuficiencia Cardíaca",
    tagline: "Cuidado del paciente · Monitoreo de peso · Manejo de diuréticos",
    home: "Inicio",
    emergency:
      "Si siente falta de aire en reposo o dolor en el pecho → Llame al 911",
  },
};

export default function Header({ lang, setLang }) {
  const t = T[lang];
  const { pathname } = useLocation();

  return (
    <header>
      <div style={s.bar}>
        <div style={s.inner}>
          <Link to="/" style={s.brand}>
            <span style={s.heart}>♥</span>
            <span>
              <span style={s.title}>{t.clinic}</span>
              <span style={s.tagline}>{t.tagline}</span>
            </span>
          </Link>
          <nav style={s.nav}>
            {pathname !== "/" && (
              <Link to="/" style={s.homeLink}>
                ← {t.home}
              </Link>
            )}
            <div style={s.langWrap}>
              <button
                onClick={() => setLang("en")}
                style={{ ...s.langBtn, ...(lang === "en" ? s.langActive : {}) }}
              >
                EN
              </button>
              <button
                onClick={() => setLang("es")}
                style={{ ...s.langBtn, ...(lang === "es" ? s.langActive : {}) }}
              >
                ES
              </button>
            </div>
          </nav>
        </div>
      </div>
      <div style={s.emergency} role="alert">
        🚨 {t.emergency}
      </div>
    </header>
  );
}

const s = {
  bar: {
    background: "linear-gradient(135deg, #0f4c75 0%, #1e3a8a 100%)",
    color: "white",
    padding: "0 20px",
    boxShadow: "0 2px 12px rgba(15,76,117,0.3)",
  },
  inner: {
    maxWidth: 1100,
    margin: "0 auto",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 0",
    flexWrap: "wrap",
    gap: 10,
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    textDecoration: "none",
    color: "white",
  },
  heart: {
    fontSize: 28,
    color: "#fca5a5",
    filter: "drop-shadow(0 0 6px rgba(252,165,165,0.5))",
    lineHeight: 1,
  },
  title: {
    display: "block",
    fontFamily: "'Lora', serif",
    fontSize: 17,
    fontWeight: 700,
  },
  tagline: { display: "block", fontSize: 11, color: "#93c5fd", marginTop: 2 },
  nav: { display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" },
  homeLink: {
    color: "#bfdbfe",
    fontSize: 13,
    fontWeight: 700,
    textDecoration: "none",
  },
  langWrap: {
    display: "flex",
    gap: 4,
    background: "rgba(255,255,255,0.12)",
    borderRadius: 8,
    padding: 3,
  },
  langBtn: {
    background: "transparent",
    border: "none",
    color: "#bfdbfe",
    borderRadius: 6,
    padding: "4px 12px",
    fontSize: 12,
    fontWeight: 800,
  },
  langActive: { background: "white", color: "#1e3a8a" },
  emergency: {
    background: "#b91c1c",
    color: "white",
    textAlign: "center",
    padding: "6px 16px",
    fontSize: 12.5,
    fontWeight: 700,
  },
};
