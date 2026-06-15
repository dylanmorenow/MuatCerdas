// Endpoint auth (publik): konfigurasi + login. Penegakan token ada di hook registerAuth.

import type { FastifyInstance } from "fastify";
import { authConfig, checkCredentials } from "../auth";

export async function authRoutes(app: FastifyInstance): Promise<void> {
  const cfg = authConfig();

  // Client memakai ini untuk tahu perlu login atau tidak.
  app.get("/api/auth/config", async () => ({ enabled: cfg.enabled }));

  app.post("/api/auth/login", async (request, reply) => {
    const body = (request.body ?? {}) as { username?: string; password?: string };
    if (!checkCredentials(body.username ?? "", body.password ?? "", cfg)) {
      return reply.code(401).send({ error: "Username atau password salah" });
    }
    const token = app.jwt.sign({ sub: body.username }, { expiresIn: "12h" });
    return { token };
  });
}
