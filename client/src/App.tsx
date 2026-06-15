import { useState } from "react";
import { Routes, Route } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { ComingSoon } from "./components/ui";
import { useAuthConfig, getToken } from "./api/auth";
import { Login } from "./pages/Login";
import { TireList } from "./pages/TireList";
import { TireUnitDetail } from "./pages/TireUnitDetail";
import { TireRecommendations } from "./pages/TireRecommendations";
import { PayloadAnalytics } from "./pages/PayloadAnalytics";
import { LoadingGuidance } from "./pages/LoadingGuidance";
import { CalibrationHealth } from "./pages/CalibrationHealth";
import { Dashboard } from "./pages/Dashboard";
import { Finance } from "./pages/Finance";
import { DataImport } from "./pages/DataImport";

export default function App() {
  const { data: authCfg, isLoading } = useAuthConfig();
  const [authed, setAuthed] = useState(() => Boolean(getToken()));

  if (isLoading) return null;
  if (authCfg?.enabled && !authed) return <Login onSuccess={() => setAuthed(true)} />;

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Dashboard />} />

        {/* Modul A — Tire (M4) */}
        <Route path="tire" element={<TireList />} />
        <Route path="tire/recommendations" element={<TireRecommendations />} />
        <Route path="tire/:id" element={<TireUnitDetail />} />

        {/* Modul B — Payload (M5) */}
        <Route path="payload" element={<PayloadAnalytics />} />
        <Route path="payload/guidance" element={<LoadingGuidance />} />
        <Route path="calibration" element={<CalibrationHealth />} />

        {/* Inti — Finansial & ROI (M6) */}
        <Route path="finance" element={<Finance />} />
        <Route path="data" element={<DataImport />} />

        <Route path="*" element={<ComingSoon title="Halaman tak ditemukan" note="Periksa kembali navigasi sidebar." />} />
      </Route>
    </Routes>
  );
}
