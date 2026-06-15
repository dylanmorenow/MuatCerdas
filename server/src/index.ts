import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import { authConfig, registerAuth } from "./auth";
import { authRoutes } from "./routes/auth";
import { healthRoutes } from "./routes/health";
import { importRoutes } from "./routes/import";
import { tiresRoutes } from "./routes/tires";
import { payloadRoutes } from "./routes/payload";
import { financeRoutes } from "./routes/finance";
import { dataRoutes } from "./routes/data";

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
  await app.register(dataRoutes);

  try {
    await app.listen({ port: PORT, host: "0.0.0.0" });
    app.log.info(`MuatCerdas server listening on http://localhost:${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

void main();
