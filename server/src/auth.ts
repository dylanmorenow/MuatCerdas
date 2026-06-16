// Auth tipis + peran (M10, FR-0004-1/2). Default NONAKTIF (AUTH_ENABLED!=true) → demo tanpa login.
// Saat aktif: JWT (@fastify/jwt) + user dari DB (admin / driver). Driver dibatasi ke unitnya.
// Bukan RBAC kompleks/multi-tenant (CLAUDE.md / MODULE_D §0).

import type { FastifyInstance } from "fastify";
import fastifyJwt from "@fastify/jwt";
import { prisma } from "./db";

export interface AuthConfig {
  enabled: boolean;
  secret: string;
}

const DEV_SECRET = "dev-secret-ubah-di-produksi";

export function authConfig(): AuthConfig {
  return {
    enabled: process.env.AUTH_ENABLED === "true",
    secret: process.env.AUTH_SECRET ?? DEV_SECRET,
  };
}

export interface AuthUser {
  username: string;
  role: string;
  name: string;
  shift: string | null;
  unitId: string | null;
}

export interface TokenPayload {
  sub: string;
  role: string;
  unitId: string | null;
}

/** Lookup user + cek password (plain — kredensial demo). null bila gagal. */
export async function authenticateUser(username: string, password: string): Promise<AuthUser | null> {
  if (!username || !password) return null;
  const u = await prisma.user.findUnique({ where: { username } });
  if (!u || u.password !== password) return null;
  return { username: u.username, role: u.role, name: u.name, shift: u.shift, unitId: u.unitId };
}

/** Path publik (tak butuh token). */
const PUBLIC_PATHS = new Set(["/api/health", "/api/auth/config", "/api/auth/login"]);
/** Path GET yang boleh diakses driver. Selain ini → 403 (FR-0004-2). */
const DRIVER_GET_PATHS = new Set(["/api/auth/me", "/api/driver/me", "/api/roadmap"]);
/** Path POST yang boleh driver (lapor massa muatan unitnya — F2). Kepemilikan unit dicek di route. */
const DRIVER_POST_PATHS = new Set(["/api/mass"]);

/** Apakah driver boleh mengakses (murni, di-unit-test). */
export function isDriverAllowed(method: string, path: string): boolean {
  if (method === "GET") return DRIVER_GET_PATHS.has(path);
  if (method === "POST") return DRIVER_POST_PATHS.has(path);
  return false;
}

export async function registerAuth(app: FastifyInstance, cfg: AuthConfig): Promise<void> {
  await app.register(fastifyJwt, { secret: cfg.secret });

  if (!cfg.enabled) {
    app.log.info("Auth NONAKTIF (set AUTH_ENABLED=true untuk mengaktifkan peran admin/driver).");
    return;
  }
  if (cfg.secret === DEV_SECRET) {
    app.log.warn("Auth AKTIF dengan AUTH_SECRET default — set AUTH_SECRET untuk produksi.");
  }

  app.addHook("onRequest", async (request, reply) => {
    if (request.method === "OPTIONS") return; // preflight CORS
    const path = request.url.split("?")[0] ?? request.url;
    if (PUBLIC_PATHS.has(path)) return;
    try {
      await request.jwtVerify();
    } catch {
      return reply.code(401).send({ error: "Tidak terautentikasi" });
    }
    const payload = request.user as unknown as TokenPayload;
    if (payload.role === "driver" && !isDriverAllowed(request.method, path)) {
      return reply.code(403).send({ error: "Akses ditolak untuk peran driver" });
    }
  });
}
