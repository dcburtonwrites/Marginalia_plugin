import { request, type ClientRequest, type IncomingMessage } from "node:http";

export interface GenerationProgress {
  phase: "thinking" | "generating";
  characters: number;
}
export type Transport = (
  url: URL,
  body: unknown,
  signal: AbortSignal,
  onProgress?: (progress: GenerationProgress) => void,
) => Promise<unknown>;
export class OllamaRequestError extends Error {
  kind: "connection" | "timeout" | "response" | "http" | "cancelled" | "limit";
  constructor(kind: OllamaRequestError["kind"], message: string) {
    super(message);
    this.name = "OllamaRequestError";
    this.kind = kind;
  }
}

/** Assemble original streamed output, publishing nothing until the final done marker. */
export class ChatStream {
  private pending = "";
  private content = "";
  private thinking = 0;
  private final: Record<string, unknown> | null = null;
  private progress?: (progress: GenerationProgress) => void;
  constructor(progress?: (progress: GenerationProgress) => void) {
    this.progress = progress;
  }
  push(chunk: string) {
    this.pending += chunk;
    let end: number;
    while ((end = this.pending.indexOf("\n")) >= 0) {
      const line = this.pending.slice(0, end).trim();
      this.pending = this.pending.slice(end + 1);
      if (line) this.line(line);
    }
  }
  private line(line: string) {
    let data: Record<string, any>;
    try {
      data = JSON.parse(line);
    } catch {
      throw new OllamaRequestError(
        "response",
        "Ollama returned an invalid streaming response. Previous results retained.",
      );
    }
    if (!data || typeof data !== "object" || Array.isArray(data))
      throw new OllamaRequestError(
        "response",
        "Ollama returned an invalid streaming response. Previous results retained.",
      );
    if (data.error)
      throw new OllamaRequestError(
        "response",
        "Ollama could not generate: " + String(data.error),
      );
    if (this.final)
      throw new OllamaRequestError(
        "response",
        "Ollama sent data after its completed response. Previous results retained.",
      );
    const text = data.message?.content,
      thinking = data.message?.thinking;
    if (typeof text === "string") {
      this.content += text;
      if (text)
        this.progress?.({
          phase: "generating",
          characters: this.content.length,
        });
    }
    if (typeof thinking === "string" && thinking) {
      this.thinking += thinking.length;
      if (!this.content)
        this.progress?.({ phase: "thinking", characters: this.thinking });
    }
    if (data.done === true) this.final = data;
  }
  finish() {
    if (this.pending.trim()) this.line(this.pending.trim());
    this.pending = "";
    if (!this.final)
      throw new OllamaRequestError(
        "response",
        "Ollama stopped before completing its response. Previous results retained.",
      );
    return {
      ...this.final,
      message: { role: "assistant", content: this.content },
    };
  }
}
export interface TransportLimits {
  idleMs?: number;
  totalMs?: number;
  maxCharacters?: number;
}
export function createHttpTransport(
  limits: TransportLimits = {},
  requester: typeof request = request,
): Transport {
  return (url, body, signal, onProgress) =>
    new Promise((resolve, reject) => {
      if (signal.aborted) {
        reject(
          new OllamaRequestError(
            "cancelled",
            "Cancelled. Previous results retained.",
          ),
        );
        return;
      }
      const chat = url.pathname === "/api/chat";
      const idleMs = limits.idleMs ?? (chat ? 180000 : 15000),
        totalMs = limits.totalMs ?? (chat ? 600000 : 30000),
        max = limits.maxCharacters ?? 4000000;
      const encoded = body === undefined ? undefined : JSON.stringify(body);
      let req: ClientRequest,
        res: IncomingMessage | undefined,
        settled = false,
        received = false;
      let totalTimer: ReturnType<typeof setTimeout> | undefined;
      const cleanup = () => {
        if (totalTimer) clearTimeout(totalTimer);
        req?.setTimeout(0);
        signal.removeEventListener("abort", cancel);
      };
      const finish = (error: Error | null, result?: unknown) => {
        if (settled) return;
        settled = true;
        cleanup();
        if (error) reject(error);
        else resolve(result);
      };
      const fail = (error: Error) => {
        if (settled) return;
        finish(error);
        res?.destroy();
        req?.destroy();
      };
      const cancel = () =>
        fail(
          new OllamaRequestError(
            "cancelled",
            "Cancelled. Previous results retained.",
          ),
        );
      const networkError = (error: NodeJS.ErrnoException) => {
        if (settled) return;
        if (signal.aborted) {
          cancel();
          return;
        }
        if (
          ["ECONNREFUSED", "ENOTFOUND", "EHOSTUNREACH", "ENETUNREACH"].includes(
            error.code ?? "",
          )
        )
          fail(
            new OllamaRequestError(
              "connection",
              "Cannot connect to local Ollama. Start Ollama and check its address.",
            ),
          );
        else if (error.code === "ECONNRESET" || error.code === "EPIPE")
          fail(
            new OllamaRequestError(
              "response",
              "Ollama closed the connection before completing its response. Previous results retained.",
            ),
          );
        else
          fail(
            new OllamaRequestError(
              "response",
              "Local Ollama request failed: " + error.message,
            ),
          );
      };
      try {
        req = requester(
          url,
          {
            method: encoded === undefined ? "GET" : "POST",
            headers: encoded
              ? {
                  "Content-Type": "application/json",
                  "Content-Length": Buffer.byteLength(encoded),
                }
              : {},
          },
          (response) => {
            res = response;
            received = true;
            const status = res.statusCode ?? 500;
            const streamed =
              status < 300 &&
              !!(body as { stream?: boolean } | undefined)?.stream &&
              !String(res.headers["content-type"] ?? "").includes(
                "application/json",
              );
            const stream = streamed ? new ChatStream(onProgress) : null;
            let text = "",
              size = 0;
            res.setEncoding("utf8");
            res.on("data", (chunk: string) => {
              if (settled) return;
              size += chunk.length;
              if (size > max) {
                fail(
                  new OllamaRequestError(
                    "limit",
                    "Ollama response exceeds the limit. Previous results retained.",
                  ),
                );
                return;
              }
              try {
                if (stream) stream.push(chunk);
                else text += chunk;
              } catch (error) {
                fail(error as Error);
              }
            });
            res.on("end", () => {
              if (settled) return;
              try {
                if (status >= 300) {
                  let detail = "";
                  try {
                    detail = String(JSON.parse(text).error ?? "");
                  } catch {}
                  throw new OllamaRequestError(
                    "http",
                    `Ollama returned HTTP ${status}${detail ? ": " + detail : ". Check the selected model and local server."}`,
                  );
                }
                if (stream) {
                  finish(null, stream.finish());
                  return;
                }
                let data: unknown;
                try {
                  data = JSON.parse(text);
                } catch {
                  throw new OllamaRequestError(
                    "response",
                    "Ollama returned an invalid JSON response. Previous results retained.",
                  );
                }
                if ((data as { error?: unknown })?.error)
                  throw new OllamaRequestError(
                    "response",
                    "Ollama could not generate: " +
                      String((data as { error: unknown }).error),
                  );
                finish(null, data);
              } catch (error) {
                fail(error as Error);
              }
            });
            res.on("error", networkError);
            res.on("aborted", () =>
              fail(
                new OllamaRequestError(
                  "response",
                  "Ollama stopped before completing its response. Previous results retained.",
                ),
              ),
            );
          },
        );
        req.setTimeout(idleMs, () =>
          fail(
            new OllamaRequestError(
              "timeout",
              chat
                ? `Local generation timed out: Ollama sent no data for ${Math.round(idleMs / 1000)} seconds${received ? " during the response" : ". It may still be loading or processing the request"}. Previous results retained.`
                : "Local Ollama did not respond in time. Check whether the server is busy.",
            ),
          ),
        );
        req.on("error", networkError);
        signal.addEventListener("abort", cancel, { once: true });
        totalTimer = setTimeout(
          () =>
            fail(
              new OllamaRequestError(
                "timeout",
                chat
                  ? "Local generation exceeded its overall time limit. Previous results retained."
                  : "Local Ollama did not respond in time. Check whether the server is busy.",
              ),
            ),
          totalMs,
        );
        if (signal.aborted) {
          cancel();
          return;
        }
        if (encoded) req.write(encoded);
        req.end();
      } catch (error) {
        fail(error as Error);
      }
    });
}
export const httpTransport = createHttpTransport();
