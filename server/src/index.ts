import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { authConfig, registerAuth } from "./auth";
import { authRoutes } from "./routes/auth";
import { healthRoutes } from "./routes/health";
import { importRoutes } from "./routes/import";
import { tiresRoutes } from "./routes/tires";
import { payloadRoutes } from "./routes/payload";
import { financeRoutes } from "./routes/finance";
import { speedRoutes } from "./routes/speed";
import { dataRoutes } from "./routes/data";
import { driverRoutes } from "./routes/driver";
import { roadmapRoutes } from "./routes/roadmap";
import { massRoutes } from "./routes/mass";
import { resolvedRoutes } from "./routes/resolved";
import { zoneRoutes } from "./routes/zones";

const PORT = Number(process.env.PORT ?? 3001);

async function main(): Promise<void> {
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: true });
  await app.register(multipart, { limits: { fileSize: 25 * 1024 * 1024 } }); // 25 MB

  // Auth tipis (opsional) — register JWT + hook penegak SEBELUM route bisnis.
  await registerAuth(app, authConfig());
  await app.register(authRoutes);

  await app.register(healthRoutes);
  await app.register(importRoutes);
  await app.register(tiresRoutes);
  await app.register(payloadRoutes);
  await app.register(financeRoutes);
  await app.register(speedRoutes);
  await app.register(dataRoutes);
  await app.register(driverRoutes);
  await app.register(roadmapRoutes);
  await app.register(massRoutes);
  await app.register(resolvedRoutes);
  await app.register(zoneRoutes);

  // Produksi: server yang sama melayani hasil build client (SPA) + API satu origin.
  const clientDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../client/dist");
  if (existsSync(clientDist)) {
    await app.register(fastifyStatic, { root: clientDist, wildcard: false });
    app.setNotFoundHandler((request, reply) => {
      if (request.method === "GET" && !request.url.startsWith("/api")) {
        return reply.sendFile("index.html"); // fallback rute SPA
      }
      return reply.code(404).send({ error: "Tidak ditemukan" });
    });
    app.log.info(`Menyajikan client dari ${clientDist}`);
  }

  try {
    await app.listen({ port: PORT, host: "0.0.0.0" });
    app.log.info(`MuatCerdas server listening on http://localhost:${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

void main();
