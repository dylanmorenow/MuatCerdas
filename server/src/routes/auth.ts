// Endpoint auth: config (publik) + login (publik) + me (protected). Peran di JWT.

import type { FastifyInstance } from "fastify";
import { authConfig, authenticateUser, type TokenPayload } from "../auth";
import { prisma } from "../db";

export async function authRoutes(app: FastifyInstance): Promise<void> {
  const cfg = authConfig();

  app.get("/api/auth/config", async () => ({ enabled: cfg.enabled }));

  app.post("/api/auth/login", async (request, reply) => {
    const body = (request.body ?? {}) as { username?: string; password?: string };
    const user = await authenticateUser(body.username ?? "", body.password ?? "");
    if (!user) {
      return reply.code(401).send({ error: "Username atau password salah" });
    }
    const token = app.jwt.sign(
      { sub: user.username, role: user.role, unitId: user.unitId },
      { expiresIn: "12h" },
    );
    return { token, role: user.role, unitId: user.unitId };
  });

  // Identitas + peran dari token (dipakai client untuk routing peran).
  app.get("/api/auth/me", async (request) => {
    const payload = request.user as unknown as TokenPayload | undefined;
    if (!payload?.sub) {
      // Auth nonaktif → tanpa token → perlakukan sebagai admin (mode demo).
      return { username: null, role: "admin", unitId: null, name: null, shift: null };
    }
    const full = await prisma.user.findUnique({ where: { username: payload.sub } });
    return {
      username: payload.sub,
      role: payload.role,
      unitId: payload.unitId ?? null,
      name: full?.name ?? payload.sub,
      shift: full?.shift ?? null,
    };
  });
}
