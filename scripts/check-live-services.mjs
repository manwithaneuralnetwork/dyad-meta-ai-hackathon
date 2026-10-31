import fs from "node:fs";
import path from "node:path";

const values = { ...process.env };
for (const file of [".env", ".env.local"]) {
  const absolute = path.join(process.cwd(), file);
  if (!fs.existsSync(absolute)) continue;
  for (const line of fs.readFileSync(absolute, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (match && !values[match[1]]) values[match[1]] = match[2].replace(/^(['"])(.*)\1$/, "$2").trim();
  }
}

const required = ["MODEL_API_KEY", "TICKETMASTER_API_KEY", "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"];
const missing = required.filter((key) => !values[key]);
if (missing.length) {
  console.error(`✗ Missing required configuration: ${missing.join(", ")}`);
  process.exit(1);
}

const checks = [
  async () => {
    const url = new URL("https://app.ticketmaster.com/discovery/v2/events.json");
    url.searchParams.set("apikey", values.TICKETMASTER_API_KEY);
    url.searchParams.set("city", "San Diego");
    url.searchParams.set("size", "1");
    const response = await fetch(url, { signal: AbortSignal.timeout(12_000) });
    if (!response.ok) throw new Error(`Ticketmaster returned HTTP ${response.status}`);
    const payload = await response.json();
    if (!Array.isArray(payload?._embedded?.events)) throw new Error("Ticketmaster returned an unexpected shape");
    console.log("✓ Ticketmaster Discovery API");
  },
  async () => {
    const response = await fetch(`${values.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/activities?select=id&limit=1`, {
      headers: { apikey: values.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, authorization: `Bearer ${values.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY}` },
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) throw new Error(`Supabase Data API returned HTTP ${response.status}`);
    if (!Array.isArray(await response.json())) throw new Error("Supabase returned an unexpected shape");
    console.log("✓ Supabase Data API");
  },
  async () => {
    const response = await fetch("https://api.meta.ai/v1/chat/completions", {
      method: "POST",
      headers: { authorization: `Bearer ${values.MODEL_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: values.META_MODEL || "muse-spark-1.3",
        messages: [{ role: "developer", content: "Return the requested JSON and nothing else." }, { role: "user", content: "Confirm service availability." }],
        response_format: { type: "json_schema", json_schema: { name: "dyad_live_check", strict: true, schema: { type: "object", additionalProperties: false, properties: { ok: { type: "boolean" } }, required: ["ok"] } } },
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error(`Meta Model API returned HTTP ${response.status}`);
    const payload = await response.json();
    if (typeof payload?.choices?.[0]?.message?.content !== "string") throw new Error("Meta returned an unexpected shape");
    console.log("✓ Meta Model API");
  },
];

let failed = false;
for (const check of checks) {
  try { await check(); }
  catch (error) {
    failed = true;
    console.error(`✗ ${error instanceof Error ? error.message : "Live service check failed"}`);
  }
}

if (failed) process.exitCode = 1;
else console.log("\nAll live services are reachable.");
