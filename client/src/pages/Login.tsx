import { useState, type FormEvent } from "react";
import { login } from "../api/auth";

export function Login({ onSuccess }: { onSuccess: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(username, password);
      onSuccess();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="text-xl font-bold text-kpp-green">MuatCerdas</div>
        <div className="mb-5 text-sm text-slate-500">Cerdas kelola ban dan muatan, KPP Mining</div>

        <label className="mb-3 block">
          <span className="mb-1 block text-xs text-slate-500">Username</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="mb-4 block">
          <span className="mb-1 block text-xs text-slate-500">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </label>

        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={busy || !username || !password}
          className="w-full rounded-md bg-kpp-green px-3 py-2 text-sm font-medium text-white hover:bg-kpp-green/90 disabled:opacity-50"
        >
          {busy ? "Masuk…" : "Masuk"}
        </button>

        <div className="mt-4 rounded-md bg-slate-50 p-2 text-[11px] text-slate-500">
          <div className="font-medium text-slate-600">Akun demo</div>
          <div>Admin: <span className="font-mono">kpp / muatcerdas</span></div>
          <div>Driver: <span className="font-mono">andi / andi123</span> (HD-01) atau <span className="font-mono">budi / budi123</span> (HT-01)</div>
        </div>
      </form>
    </div>
  );
}
