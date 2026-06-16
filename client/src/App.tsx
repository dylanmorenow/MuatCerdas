import { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { ComingSoon } from "./components/ui";
import { useAuthConfig, useMe, getToken } from "./api/auth";
import { Login } from "./pages/Login";
import { TireList } from "./pages/TireList";
import { TireUnitDetail } from "./pages/TireUnitDetail";
import { TireRecommendations } from "./pages/TireRecommendations";
import { PayloadAnalytics } from "./pages/PayloadAnalytics";
import { LoadingGuidance } from "./pages/LoadingGuidance";
import { CalibrationHealth } from "./pages/CalibrationHealth";
import { Dashboard } from "./pages/Dashboard";
import { Finance } from "./pages/Finance";
import { SpeedOptimization } from "./pages/SpeedOptimization";
import { DataImport } from "./pages/DataImport";
import { DriverDashboard } from "./pages/DriverDashboard";
import { RoadMap } from "./pages/RoadMap";

export default function App() {
  const { data: authCfg, isLoading } = useAuthConfig();
  const [authed, setAuthed] = useState(() => Boolean(getToken()));

  if (isLoading) return null;
  if (authCfg?.enabled && !authed) return <Login onSuccess={() => setAuthed(true)} />;

  return <RoleRouter />;
}

/** Routing peran: driver → surface driver; admin (atau auth nonaktif) → seluruh app. */
function RoleRouter() {
  const { data: me, isLoading } = useMe();
  if (isLoading) return null;
  if (me?.role === "driver") return <DriverDashboard />;
  return <AdminApp />;
}

function AdminApp() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Dashboard />} />

        {/* Modul A — Tire */}
        <Route path="tire" element={<TireList />} />
        <Route path="tire/recommendations" element={<TireRecommendations />} />
        <Route path="tire/:id" element={<TireUnitDetail />} />

        {/* Modul B — Payload */}
        <Route path="payload" element={<PayloadAnalytics />} />
        <Route path="payload/mass" element={<LoadingGuidance />} />
        <Route path="payload/guidance" element={<Navigate to="/payload/mass" replace />} />
        <Route path="calibration" element={<CalibrationHealth />} />

        {/* Modul C — Kecepatan/TKPH + Modul D — Peta */}
        <Route path="speed" element={<SpeedOptimization />} />
        <Route path="roadmap" element={<RoadMap />} />

        {/* Inti */}
        <Route path="finance" element={<Finance />} />
        <Route path="data" element={<DataImport />} />

        <Route path="*" element={<ComingSoon title="Halaman tak ditemukan" note="Periksa kembali navigasi sidebar." />} />
      </Route>
    </Routes>
  );
}
