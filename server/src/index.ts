import path from "node:path";
import { fileURLToPath } from "node:url";
import Fastify from "fastify";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import openf1Routes from "./routes/openf1.js";

const PORT = Number(process.env.PORT ?? 4000);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_DIST = path.resolve(__dirname, "../../client/dist");

async function main() {
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: true });
  await app.register(openf1Routes);

  app.get("/api/health", async () => ({ status: "ok" }));

  // In production this server also serves the built client, so the whole
  // app is a single deployable process. In dev, Vite serves the client
  // separately and proxies /api to this server instead.
  if (process.env.NODE_ENV === "production") {
    await app.register(fastifyStatic, { root: CLIENT_DIST });
    app.setNotFoundHandler((req, reply) => {
      if (req.raw.url?.startsWith("/api")) {
        reply.code(404).send({ error: "not_found" });
        return;
      }
      reply.sendFile("index.html");
    });
  }

  await app.listen({ port: PORT, host: "0.0.0.0" });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
