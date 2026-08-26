import type { FastifyInstance } from "fastify";
import { fetchOpenF1, UpstreamError } from "../lib/openf1Client.js";

// TTLs are tuned per resource: fast-changing telemetry gets a short TTL so
// polling clients still see fresh-ish data, slow-changing resources (session
// metadata, driver list) get a long TTL to minimize upstream calls.
const TTL_MS: Record<string, number> = {
  sessions: 60_000,
  drivers: 60_000,
  location: 3_000,
  car_data: 2_000,
  intervals: 3_000,
  laps: 5_000,
};

const RESOURCES = Object.keys(TTL_MS);

// Fastify lower-cases and normalizes query keys unpredictably for things
// like "date>". Read the raw query string ourselves and forward it as-is
// so OpenF1's comparison-operator params (date>=..., date<=...) survive.
function rawQueryParams(url: string): Record<string, string> {
  const qs = url.split("?")[1] ?? "";
  const params: Record<string, string> = {};
  for (const pair of qs.split("&")) {
    if (!pair) continue;
    const idx = pair.indexOf("=");
    const key = decodeURIComponent(idx === -1 ? pair : pair.slice(0, idx));
    const value = decodeURIComponent(idx === -1 ? "" : pair.slice(idx + 1));
    params[key] = value;
  }
  return params;
}

export default async function openf1Routes(app: FastifyInstance): Promise<void> {
  for (const resource of RESOURCES) {
    app.get(`/api/${resource}`, async (req, reply) => {
      const params = rawQueryParams(req.raw.url ?? "");
      try {
        const data = await fetchOpenF1(resource, params, TTL_MS[resource]);
        reply.send(data);
      } catch (err) {
        if (err instanceof UpstreamError) {
          reply.code(err.status >= 400 && err.status < 600 ? err.status : 502).send({
            error: "upstream_error",
            message: err.message,
          });
          return;
        }
        req.log.error(err);
        reply.code(502).send({ error: "upstream_error", message: "Failed to reach OpenF1" });
      }
    });
  }
}
