// Auth tipis satu organisasi (FR-0002-16). Default NONAKTIF (AUTH_ENABLED!=true) →
// demo & alur lain tak terpengaruh. Saat aktif: JWT (@fastify/jwt), satu kredensial dari env.
// Bukan manajemen user/RBAC (sengaja tipis — CLAUDE.md).

import type { FastifyInstance } from "fastify";
import fastifyJwt from "@fastify/jwt";

export interface AuthConfig {
  enabled: boolean;
  username: string;
  password: string;
  secret: string;
}

const DEV_SECRET = "dev-secret-ubah-di-produksi";

export function authConfig(): AuthConfig {
  return {
    enabled: process.env.AUTH_ENABLED === "true",
    username: process.env.AUTH_USERNAME ?? "kpp",
    password: process.env.AUTH_PASSWORD ?? "muatcerdas",
    secret: process.env.AUTH_SECRET ?? DEV_SECRET,
  };
}

/** Validasi kredensial tunggal (murni, di-unit-test). */
export function checkCredentials(username: string, password: string, cfg: AuthConfig): boolean {
  return password.length > 0 && username === cfg.username && password === cfg.password;
}

/** Path yang selalu publik (tak butuh token). */
const PUBLIC_PATHS = new Set(["/api/health", "/api/auth/config", "/api/auth/login"]);

/**
 * Register @fastify/jwt + (bila aktif) hook onRequest yang menegakkan token pada semua
 * route /api kecuali allowlist. Panggil SEBELUM register route bisnis.
 */
export async function registerAuth(app: FastifyInstance, cfg: AuthConfig): Promise<void> {
  await app.register(fastifyJwt, { secret: cfg.secret });

  if (!cfg.enabled) {
    app.log.info("Auth NONAKTIF (set AUTH_ENABLED=true untuk mengaktifkan).");
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
  });
}
