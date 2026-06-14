import { Routes, Route } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { ComingSoon } from "./components/ui";
import { TireList } from "./pages/TireList";
import { TireUnitDetail } from "./pages/TireUnitDetail";
import { TireRecommendations } from "./pages/TireRecommendations";

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<ComingSoon title="Dashboard" note="KPI gabungan, biaya terhindarkan & ROI hadir di milestone M6." />} />

        {/* Modul A — Tire (M4) */}
        <Route path="tire" element={<TireList />} />
        <Route path="tire/recommendations" element={<TireRecommendations />} />
        <Route path="tire/:id" element={<TireUnitDetail />} />

        {/* Layar milestone berikutnya */}
        <Route path="payload" element={<ComingSoon title="Payload — Analitik" note="Modul B (HD785) hadir di M5." />} />
        <Route path="payload/guidance" element={<ComingSoon title="Loading Guidance" note="Indikator pemuatan hijau/kuning/merah hadir di M5." />} />
        <Route path="calibration" element={<ComingSoon title="Calibration Health" note="Hadir di M5." />} />
        <Route path="finance" element={<ComingSoon title="Finansial & ROI" note="Hadir di M6." />} />
        <Route path="data" element={<ComingSoon title="Data / Import" note="Hadir di M7. Endpoint /api/import sudah aktif." />} />

        <Route path="*" element={<ComingSoon title="Halaman tak ditemukan" note="Periksa kembali navigasi sidebar." />} />
      </Route>
    </Routes>
  );
}
