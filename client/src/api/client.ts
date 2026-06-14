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

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(path);
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
