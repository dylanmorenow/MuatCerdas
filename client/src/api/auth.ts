// Auth client: konfigurasi (perlu login?) + login. Token disimpan via client.ts.
import { useQuery } from "@tanstack/react-query";
import { apiGet, setToken, clearToken, getToken } from "./client";

export { getToken, clearToken };

export interface AuthConfigResp {
  enabled: boolean;
}

export function useAuthConfig() {
  return useQuery({
    queryKey: ["auth-config"],
    queryFn: () => apiGet<AuthConfigResp>("/api/auth/config"),
    staleTime: Infinity,
  });
}

export interface Me {
  username: string | null;
  role: string;
  unitId: string | null;
  name: string | null;
  shift: string | null;
}

/** Identitas + peran dari token (admin/driver) — sumber routing peran. */
export function useMe() {
  return useQuery({ queryKey: ["me"], queryFn: () => apiGet<Me>("/api/auth/me"), staleTime: Infinity });
}

/** Login langsung (tak lewat handler 401 generik) → simpan token. */
export async function login(username: string, password: string): Promise<void> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body?.error ?? "Login gagal");
  }
  const { token } = (await res.json()) as { token: string };
  setToken(token);
}
