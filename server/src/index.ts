import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import { healthRoutes } from "./routes/health";
import { importRoutes } from "./routes/import";
import { tiresRoutes } from "./routes/tires";
import { payloadRoutes } from "./routes/payload";

const PORT = Number(process.env.PORT ?? 3001);

async function main(): Promise<void> {
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: true });
  await app.register(multipart, { limits: { fileSize: 25 * 1024 * 1024 } }); // 25 MB
  await app.register(healthRoutes);
  await app.register(importRoutes);
  await app.register(tiresRoutes);
  await app.register(payloadRoutes);

  try {
    await app.listen({ port: PORT, host: "0.0.0.0" });
    app.log.info(`MuatCerdas server listening on http://localhost:${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

void main();
