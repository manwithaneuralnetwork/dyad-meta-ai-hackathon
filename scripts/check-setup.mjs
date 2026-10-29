import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const files = [".env", ".env.local"];
const values = {};

for (const file of files) {
  const absolute = path.join(root, file);
  if (!fs.existsSync(absolute)) continue;

  for (const line of fs.readFileSync(absolute, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    values[match[1]] = match[2].replace(/^(['"])(.*)\1$/, "$2").trim();
  }
}

const present = (key) => Boolean(process.env[key] || values[key]);
const pass = (message) => console.log(`✓ ${message}`);
const warn = (message) => console.log(`○ ${message}`);
const fail = (message) => {
  console.error(`✗ ${message}`);
  process.exitCode = 1;
};

console.log("Dyad setup check (values are never printed)\n");

if (present("MODEL_API_KEY")) pass("Meta Model API key is configured");
else fail("MODEL_API_KEY is missing");

if (present("TICKETMASTER_API_KEY")) pass("Ticketmaster API key is configured");
else fail("TICKETMASTER_API_KEY is missing");

if (present("META_MODEL")) pass("Meta model override is configured");
else warn("META_MODEL is unset; the application default will be used");

if (present("NEXT_PUBLIC_APP_URL")) pass("Application URL is configured");
else warn("NEXT_PUBLIC_APP_URL is unset; localhost will be assumed during development");

if (present("CRON_SECRET")) pass("Cron secret is configured for optional catalog refreshes");
else warn("CRON_SECRET is missing; scheduled event refreshes must stay disabled");

const supabaseClientKeys = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
];
const configuredSupabaseClientKeys = supabaseClientKeys.filter(present);

if (configuredSupabaseClientKeys.length === 0) {
  warn("Supabase is intentionally not configured; session-only demo mode is ready");
} else if (configuredSupabaseClientKeys.length === supabaseClientKeys.length) {
  pass("Supabase public client configuration is complete");
} else {
  fail(`Supabase public client is only partially configured; set both: ${supabaseClientKeys.join(", ")}`);
}

if (present("SUPABASE_SECRET_KEY")) pass("Supabase server secret is configured");
else warn("Supabase server secret is unset; elevated server operations stay disabled");

console.log("\nThis check validates configuration shape only. It does not print or transmit secrets.");
