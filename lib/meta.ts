import { z } from "zod";

const META_API_URL = "https://api.meta.ai/v1/chat/completions";

export async function callMuseStructured<T>({
  name,
  system,
  prompt,
  schema,
  validator,
  timeoutMs = 25_000,
}: {
  name: string;
  system: string;
  prompt: string;
  schema: Record<string, unknown>;
  validator: z.ZodType<T>;
  timeoutMs?: number;
}): Promise<{ data: T; usage?: Record<string, number>; model: string } | null> {
  const apiKey = process.env.MODEL_API_KEY;
  if (!apiKey) return null;

  const model = process.env.META_MODEL || "muse-spark-1.3";
  const response = await fetch(META_API_URL, {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        { role: "developer", content: system },
        { role: "user", content: prompt }
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name, strict: true, schema }
      }
    }),
    signal: AbortSignal.timeout(timeoutMs)
  });

  if (!response.ok) throw new Error(`Meta Model API returned ${response.status}`);
  const payload = await response.json();
  const content = payload.choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new Error("Meta Model API returned no structured content");
  return { data: validator.parse(JSON.parse(content)), usage: payload.usage, model };
}

export const aiRunMetadata = (taskType: string, startedAt: number, result: { usage?: Record<string, number>; model: string } | null) => ({
  taskType,
  model: result?.model ?? "deterministic-fallback",
  latencyMs: Date.now() - startedAt,
  usage: result?.usage ?? null,
  usedFallback: !result
});
