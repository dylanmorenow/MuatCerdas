// Pembungkus fetch tipis ke API server (proxy /api → Fastify). Menyisipkan token auth
// (bila ada) & menangani 401 (sesi berakhir → hapus token + kembali ke login).

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const TOKEN_KEY = "mc_token";
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

function authHeaders(): Record<string, string> {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

async function handle<T>(res: Response): Promise<T> {
  if (res.status === 401) {
    // Sesi berakhir/invalid → bersihkan & kembali ke login (gate di App).
    clearToken();
    if (typeof window !== "undefined") window.location.reload();
    throw new ApiError(401, "Sesi berakhir, silakan login ulang");
  }
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body?.error) msg = body.error;
    } catch {
      /* abaikan body non-JSON */
    }
    throw new ApiError(res.status, msg);
  }
  return (await res.json()) as T;
}

export async function apiGet<T>(path: string): Promise<T> {
  return handle<T>(await fetch(path, { headers: authHeaders() }));
}

export async function apiSend<T>(path: string, method: "PUT" | "POST" | "DELETE", body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: {
      ...authHeaders(),
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return handle<T>(res);
}
