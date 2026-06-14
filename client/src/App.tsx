import { useEffect, useState } from "react";
import { formatRupiah, defaultCostParams } from "@muatcerdas/shared";

type Health = { status: string; service: string; time: string };

export default function App() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => (r.ok ? (r.json() as Promise<Health>) : Promise.reject(new Error("not ok"))))
      .then(setHealth)
      .catch(() => setError(true));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="bg-kpp-green text-white">
        <div className="mx-auto max-w-5xl px-6 py-5">
          <h1 className="text-2xl font-bold">MuatCerdas</h1>
          <p className="text-sm text-white/80">
            Tire &amp; Payload Intelligence Platform — KPP Mining
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-400" />
            <h2 className="text-lg font-semibold">Fondasi (M1) — dalam pembangunan</h2>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            Kerangka aplikasi siap. Modul A (ban truk hauling) &amp; Modul B (payload HD785)
            menyusul pada milestone berikutnya.
          </p>

          <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-lg bg-slate-50 p-4">
              <dt className="text-xs uppercase tracking-wide text-slate-400">Koneksi server</dt>
              <dd className="mt-1 font-medium">
                {health ? (
                  <span className="text-kpp-green">● Terhubung ({health.status})</span>
                ) : error ? (
                  <span className="text-red-600">● Tidak terhubung</span>
                ) : (
                  <span className="text-slate-400">Memeriksa…</span>
                )}
              </dd>
            </div>
            <div className="rounded-lg bg-slate-50 p-4">
              <dt className="text-xs uppercase tracking-wide text-slate-400">
                Cek format domain (shared)
              </dt>
              <dd className="mt-1 font-medium">
                Harga ban (asumsi): {formatRupiah(defaultCostParams.tirePriceIdr)}
              </dd>
            </div>
          </dl>
        </div>
      </main>
    </div>
  );
}
