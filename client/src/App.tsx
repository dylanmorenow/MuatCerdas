import { Routes, Route } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { ComingSoon } from "./components/ui";
import { TireList } from "./pages/TireList";
import { TireUnitDetail } from "./pages/TireUnitDetail";
import { TireRecommendations } from "./pages/TireRecommendations";
import { PayloadAnalytics } from "./pages/PayloadAnalytics";
import { LoadingGuidance } from "./pages/LoadingGuidance";
import { CalibrationHealth } from "./pages/CalibrationHealth";

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<ComingSoon title="Dashboard" note="KPI gabungan, biaya terhindarkan & ROI hadir di milestone M6." />} />

        {/* Modul A — Tire (M4) */}
        <Route path="tire" element={<TireList />} />
        <Route path="tire/recommendations" element={<TireRecommendations />} />
        <Route path="tire/:id" element={<TireUnitDetail />} />

        {/* Modul B — Payload (M5) */}
        <Route path="payload" element={<PayloadAnalytics />} />
        <Route path="payload/guidance" element={<LoadingGuidance />} />
        <Route path="calibration" element={<CalibrationHealth />} />

        {/* Layar milestone berikutnya */}
        <Route path="finance" element={<ComingSoon title="Finansial & ROI" note="Hadir di M6." />} />
        <Route path="data" element={<ComingSoon title="Data / Import" note="Hadir di M7. Endpoint /api/import sudah aktif." />} />

        <Route path="*" element={<ComingSoon title="Halaman tak ditemukan" note="Periksa kembali navigasi sidebar." />} />
      </Route>
    </Routes>
  );
}
