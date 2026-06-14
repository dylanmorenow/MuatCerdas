// Pembungkus fetch tipis ke API server (proxy /api → Fastify, lihat vite.config.ts).

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function handle<T>(res: Response): Promise<T> {
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
  return handle<T>(await fetch(path));
}

export async function apiSend<T>(path: string, method: "PUT" | "POST" | "DELETE", body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return handle<T>(res);
}
