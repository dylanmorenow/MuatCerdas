// Kerangka aplikasi: sidebar navigasi (PRD §13) + header produk. Responsif: sidebar
// jadi drawer (hamburger) di layar kecil, tetap di layar lebar.
import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { cx } from "./ui";
import { useAuthConfig, useMe, clearToken } from "../api/auth";

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
    heading: "Modul C/D — Operasi",
    items: [
      { to: "/speed", label: "Speed Optimization" },
      { to: "/roadmap", label: "Peta Jalan" },
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
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { data: authCfg } = useAuthConfig();
  const { data: me } = useMe();
  useEffect(() => setOpen(false), [location.pathname]);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside
        className={cx(
          "fixed inset-y-0 left-0 z-40 w-64 flex-col bg-kpp-green text-white lg:static lg:flex",
          open ? "flex" : "hidden lg:flex",
        )}
      >
        <div className="border-b border-white/10 px-5 py-5">
          <div className="text-lg font-bold">MuatCerdas</div>
          <div className="text-xs text-white/70">Tire &amp; Payload Intelligence — KPP</div>
        </div>
        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-5">
          {NAV.map((group) => (
            <div key={group.heading}>
              <div className="px-2 text-[10px] font-semibold uppercase tracking-wider text-white/50">{group.heading}</div>
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
        <div className="border-t border-white/10 px-5 py-3">
          {authCfg?.enabled && me?.username && (
            <div className="mb-1.5 text-[11px] text-white/70">
              Masuk: <span className="font-medium text-white">{me.name ?? me.username}</span> ({me.role})
            </div>
          )}
          {authCfg?.enabled && (
            <button
              onClick={() => {
                clearToken();
                window.location.reload();
              }}
              className="mb-2 w-full rounded-md bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20"
            >
              Keluar
            </button>
          )}
          <div className="text-[10px] text-white/50">Data contoh / import · bukan telematik live</div>
        </div>
      </aside>

      {open && <div className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={() => setOpen(false)} />}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <button
            onClick={() => setOpen(true)}
            aria-label="Buka menu"
            className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <span className="font-bold text-kpp-green">MuatCerdas</span>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-8 sm:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
