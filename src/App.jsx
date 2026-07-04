import { useState, useEffect } from "react";
// HashRouter (URLs like #/patient) so the app also works when opened as a
// plain file from the desktop, where there is no server to handle routes.
import { HashRouter, Routes, Route } from "react-router-dom";
import Header from "./components/Header.jsx";
import Home from "./pages/Home.jsx";
import PrescribeTool from "./pages/PrescribeTool.jsx";
import { PatientPage, PhysicianPage } from "./MonitorPlatform.jsx";
import { migrateLocalToSupabase } from "./db";

export default function App() {
  const [lang, setLang] = useState("en");

  // One-time: lift any pre-existing localStorage patients into Supabase.
  useEffect(() => { migrateLocalToSupabase(); }, []);

  return (
    <HashRouter>
      <Header lang={lang} setLang={setLang} />
      <Routes>
        <Route path="/" element={<Home lang={lang} />} />
        <Route path="/patient" element={<PatientPage lang={lang} />} />
        <Route path="/physician" element={<PhysicianPage />} />
        <Route path="/prescribe" element={<PrescribeTool />} />
      </Routes>
    </HashRouter>
  );
}
