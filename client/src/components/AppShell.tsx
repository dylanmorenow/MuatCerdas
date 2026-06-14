// Kerangka aplikasi: sidebar navigasi (PRD §13) + header produk. Layar di <Outlet>.
import { NavLink, Outlet } from "react-router-dom";
import { cx } from "./ui";

interface NavItem {
  to: string;
  label: string;
  end?: boolean;
}
interface NavGroup {
  heading: string;
  items: NavItem[];
}

const NAV: NavGroup[] = [
  { heading: "Ringkasan", items: [{ to: "/", label: "Dashboard", end: true }] },
  {
    heading: "Modul A — Ban (truk hauling)",
    items: [
      { to: "/tire", label: "Daftar & Prediksi", end: true },
      { to: "/tire/recommendations", label: "Rekomendasi" },
    ],
  },
  {
    heading: "Modul B — Payload (HD785)",
    items: [
      { to: "/payload", label: "Analitik" },
      { to: "/payload/guidance", label: "Loading Guidance" },
      { to: "/calibration", label: "Calibration Health" },
    ],
  },
  {
    heading: "Inti",
    items: [
      { to: "/finance", label: "Finansial & ROI" },
      { to: "/data", label: "Data / Import" },
    ],
  },
];

export function AppShell() {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="flex w-64 flex-shrink-0 flex-col bg-kpp-green text-white">
        <div className="border-b border-white/10 px-5 py-5">
          <div className="text-lg font-bold">MuatCerdas</div>
          <div className="text-xs text-white/70">Tire &amp; Payload Intelligence — KPP</div>
        </div>
        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-5">
          {NAV.map((group) => (
            <div key={group.heading}>
              <div className="px-2 text-[10px] font-semibold uppercase tracking-wider text-white/50">
                {group.heading}
              </div>
              <div className="mt-1.5 space-y-0.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      cx(
                        "block rounded-md px-3 py-2 text-sm transition-colors",
                        isActive ? "bg-white/15 font-medium text-white" : "text-white/75 hover:bg-white/10",
                      )
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="border-t border-white/10 px-5 py-3 text-[10px] text-white/50">
          Data contoh / import · bukan telematik live
        </div>
      </aside>

      <div className="flex-1 overflow-x-hidden">
        <main className="mx-auto max-w-6xl px-8 py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
