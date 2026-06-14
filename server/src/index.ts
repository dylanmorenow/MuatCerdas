import Fastify from "fastify";
import cors from "@fastify/cors";
import { healthRoutes } from "./routes/health";

const PORT = Number(process.env.PORT ?? 3001);

async function main(): Promise<void> {
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: true });
  await app.register(healthRoutes);

  try {
    await app.listen({ port: PORT, host: "0.0.0.0" });
    app.log.info(`MuatCerdas server listening on http://localhost:${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

void main();
