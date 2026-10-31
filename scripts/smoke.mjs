const baseUrl = (process.argv[2] || process.env.NEXT_PUBLIC_APP_URL || "http://127.0.0.1:3000").replace(/\/$/, "");

const checks = [
  { path: "/", label: "landing page", includes: "Find things to do" },
  { path: "/login", label: "login page", includes: "Log in to Dyad" },
  { path: "/signup", label: "signup page", includes: "Join Dyad" },
];

let failed = false;

for (const check of checks) {
  try {
    const response = await fetch(`${baseUrl}${check.path}`, { signal: AbortSignal.timeout(10_000) });
    const body = await response.text();
    if (!response.ok || !body.includes(check.includes)) throw new Error(`HTTP ${response.status} or expected copy missing`);
    console.log(`✓ ${check.label}`);
  } catch (error) {
    failed = true;
    console.error(`✗ ${check.label}: ${error instanceof Error ? error.message : "request failed"}`);
  }
}

try {
  const response = await fetch(`${baseUrl}/api/health`, { signal: AbortSignal.timeout(10_000) });
  const health = await response.json();
  if (!response.ok || health.status !== "ok") throw new Error(`reported ${health.status || response.status}`);
  console.log("✓ Supabase, Meta, and Ticketmaster configuration");
} catch (error) {
  failed = true;
  console.error(`✗ service health: ${error instanceof Error ? error.message : "request failed"}`);
}

if (failed) process.exitCode = 1;
else console.log(`\nDyad smoke check passed at ${baseUrl}`);
