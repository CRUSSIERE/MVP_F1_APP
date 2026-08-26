import Fastify from "fastify";
import cors from "@fastify/cors";
import openf1Routes from "./routes/openf1.js";

const PORT = Number(process.env.PORT ?? 4000);

async function main() {
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: true });
  await app.register(openf1Routes);

  app.get("/api/health", async () => ({ status: "ok" }));

  await app.listen({ port: PORT, host: "0.0.0.0" });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
