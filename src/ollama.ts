import {
  httpTransport,
  type Transport,
  type GenerationProgress,
} from "./transport.ts";
export { httpTransport, type Transport } from "./transport.ts";
export interface OllamaSettings {
  endpoint: string;
  model: string;
  context: number;
}
export function localEndpoint(endpoint: string): URL {
  const url = new URL(endpoint);
  if (
    url.protocol !== "http:" ||
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
    url.username ||
    url.password ||
    (url.pathname !== "/" && url.pathname !== "") ||
    url.search ||
    url.hash
  )
    throw new Error(
      "Use a local Ollama address such as http://127.0.0.1:11434.",
    );
  // Avoid DNS resolution for localhost.
  if (url.hostname === "localhost") url.hostname = "127.0.0.1";
  return url;
}
export async function localModels(
  settings: OllamaSettings,
  signal: AbortSignal,
  transport: Transport = httpTransport,
): Promise<string[]> {
  const data = (await transport(
    new URL("/api/tags", localEndpoint(settings.endpoint)),
    undefined,
    signal,
  )) as {
    models?: { name: string; remote_model?: string; remote_host?: string }[];
  };
  return (data.models ?? [])
    .filter(
      (m) =>
        typeof m.name === "string" &&
        !/cloud/i.test(m.name) &&
        !m.remote_model &&
        !m.remote_host,
    )
    .map((m) => m.name);
}
export async function generate(
  settings: OllamaSettings,
  system: string,
  user: string,
  signal: AbortSignal,
  transport: Transport = httpTransport,
  onProgress?: (progress: GenerationProgress) => void,
  format?: "json",
): Promise<string> {
  settings = { ...settings };
  if (!settings.model)
    throw new Error(
      "Choose an installed local model in Marginalia settings first.",
    );
  if (/cloud/i.test(settings.model))
    throw new Error("Cloud models are disabled. Choose a local model.");
  if (
    !Number.isInteger(settings.context) ||
    settings.context < 8192 ||
    settings.context > 131072
  )
    throw new Error("Context must be between 8192 and 131072 tokens.");
  const base = localEndpoint(settings.endpoint);
  const details = (await transport(
    new URL("/api/show", base),
    { model: settings.model },
    signal,
  )) as {
    remote_host?: string;
    remote_model?: string;
    model_info?: Record<string, unknown>;
    thinking?: { values?: unknown[] };
  };
  if (details.remote_host || details.remote_model)
    throw new Error("This model runs remotely. Choose a local model.");
  const max = Object.entries(details.model_info ?? {}).find(([key]) =>
    key.endsWith(".context_length"),
  )?.[1];
  if (typeof max === "number" && settings.context > max)
    throw new Error(
      `Selected context exceeds this model’s ${max}-token limit.`,
    );
  // Deliberately conservative UTF-8 estimate; fail rather than silently discard source text.
  if (new TextEncoder().encode(system + user).length + 8192 > settings.context)
    throw new Error(
      "This request exceeds the conservative context budget. Increase context or use fewer references.",
    );
  const result = (await transport(
    new URL("/api/chat", base),
    {
      model: settings.model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      stream: true,
      ...(format?{format}:{}),
      ...(details.thinking?.values?.includes(false) ? { think: false } : {}),
      options: {
        num_ctx: settings.context,
        num_predict: 4096,
        temperature: 0.2,
      },
    },
    signal,
    onProgress,
  )) as { message?: { content?: string }; done_reason?: string };
  signal.throwIfAborted();
  if (result.done_reason === "length")
    throw new Error("The response was cut short. Previous results retained.");
  const text = result.message?.content?.trim();
  if (!text)
    throw new Error(
      "The local model returned no text. Previous results retained.",
    );
  return text;
}
