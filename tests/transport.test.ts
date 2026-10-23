import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import type { request } from "node:http";
import {
  ChatStream,
  createHttpTransport,
  OllamaRequestError,
} from "../src/transport.ts";
const endpoint = new URL("http://127.0.0.1:11434/api/chat");
const signal = () => new AbortController().signal;
function fakeRequest(
  run: (
    req: any,
    reply: (contentType?: string, status?: number) => any,
  ) => void,
): typeof request {
  return ((_url: any, _options: any, respond: any) => {
    const req: any = new EventEmitter();
    let timeout: ReturnType<typeof setTimeout> | undefined,
      ms = 0,
      callback: () => void;
    const reset = () => {
      if (timeout) clearTimeout(timeout);
      if (ms) timeout = setTimeout(() => callback(), ms);
    };
    req.setTimeout = (duration: number, cb?: () => void) => {
      ms = duration;
      if (cb) callback = cb;
      reset();
      return req;
    };
    req.write = () => {};
    req.destroy = () => {
      if (timeout) clearTimeout(timeout);
      req.destroyed = true;
    };
    req.end = () =>
      queueMicrotask(() =>
        run(req, (type = "application/x-ndjson", status = 200) => {
          const res: any = new PassThrough();
          res.headers = { "content-type": type };
          res.statusCode = status;
          res.prependListener("data", reset);
          res.on("end", () => {
            if (timeout) clearTimeout(timeout);
          });
          res.on("close", () => {
            if (timeout) clearTimeout(timeout);
          });
          respond(res);
          return res;
        }),
      );
    return req;
  }) as unknown as typeof request;
}
test("streaming joins arbitrary chunks and exposes progress without returning partial content", () => {
  const progress: any[] = [];
  const stream = new ChatStream((p) => progress.push(p));
  stream.push(
    '{"message":{"thinking":"internal"},"done":false}\r\n{"message":{"con',
  );
  stream.push('tent":"## Summary\\nMíra "},"done":false}\n');
  stream.push(
    '{"message":{"content":"guards the archive."},"done":true,"done_reason":"stop"}',
  );
  const result = stream.finish() as any;
  assert.equal(result.message.content, "## Summary\nMíra guards the archive.");
  assert.equal(result.done, true);
  assert.ok(progress.some((p) => p.phase === "thinking"));
  assert.ok(progress.some((p) => p.phase === "generating"));
  assert.ok(!JSON.stringify(progress).includes("internal"));
});
test("incomplete, malformed and API-error streams cannot publish partial drafts", () => {
  const missing = new ChatStream();
  missing.push('{"message":{"content":"partial"},"done":false}\n');
  assert.throws(() => missing.finish(), /before completing/);
  const malformed = new ChatStream();
  assert.throws(() => malformed.push("not json\n"), /invalid streaming/);
  const errored = new ChatStream();
  assert.throws(
    () => errored.push('{"error":"model runner out of memory"}\n'),
    /out of memory/,
  );
});
test("a silent generation timeout is not mislabeled as a connection failure", async () => {
  const transport = createHttpTransport(
    { idleMs: 10, totalMs: 100 },
    fakeRequest(() => {}),
  );
  await assert.rejects(
    transport(endpoint, { stream: true }, signal()),
    (e: OllamaRequestError) =>
      e.kind === "timeout" &&
      /timed out/.test(e.message) &&
      !/Cannot connect|Cannot reach/.test(e.message),
  );
});
test("only genuine connection failures suggest starting Ollama", async () => {
  const refused = createHttpTransport(
    {},
    fakeRequest((req) =>
      req.emit(
        "error",
        Object.assign(new Error("refused"), { code: "ECONNREFUSED" }),
      ),
    ),
  );
  await assert.rejects(
    refused(endpoint, {}, signal()),
    /Cannot connect to local Ollama/,
  );
  const api = createHttpTransport(
    {},
    fakeRequest((_req, reply) =>
      reply("application/json").end('{"error":"model runner out of memory"}'),
    ),
  );
  await assert.rejects(
    api(endpoint, {}, signal()),
    (e) =>
      /out of memory/.test((e as Error).message) &&
      !/Cannot connect/.test((e as Error).message),
  );
  const missing = createHttpTransport(
    {},
    fakeRequest((_req, reply) =>
      reply("application/json", 404).end('{"error":"model not found"}'),
    ),
  );
  await assert.rejects(
    missing(endpoint, {}, signal()),
    /HTTP 404: model not found/,
  );
});
test("a progressing generation can exceed one idle window and complete normally", async () => {
  const transport = createHttpTransport(
    { idleMs: 50, totalMs: 500 },
    fakeRequest((_req, reply) => {
      const res = reply();
      res.write('{"message":{"content":"A"},"done":false}\n');
      let count = 0;
      const interval = setInterval(() => {
        if (res.destroyed) {
          clearInterval(interval);
          return;
        }
        count++;
        if (count === 4) {
          clearInterval(interval);
          res.end('{"message":{"content":"Z"},"done":true}\n');
        } else res.write('{"message":{"content":"B"},"done":false}\n');
      }, 20);
    }),
  );
  const result = (await transport(endpoint, { stream: true }, signal())) as any;
  assert.equal(result.message.content, "ABBBZ");
});
test("stream cancellation and an overall deadline retain previous results", async () => {
  const controller = new AbortController();
  const cancel = createHttpTransport(
    {},
    fakeRequest((_req, reply) =>
      reply().write('{"message":{"content":"partial"},"done":false}\n'),
    ),
  );
  await assert.rejects(
    cancel(endpoint, { stream: true }, controller.signal, () =>
      controller.abort(),
    ),
    /Cancelled/,
  );
  const deadline = createHttpTransport(
    { idleMs: 100, totalMs: 30 },
    fakeRequest((_req, reply) => {
      const res = reply();
      const interval = setInterval(() => {
        if (res.destroyed) {
          clearInterval(interval);
          return;
        }
        res.write('{"message":{"content":"x"},"done":false}\n');
      }, 5);
    }),
  );
  await assert.rejects(
    deadline(endpoint, { stream: true }, signal()),
    /overall time limit/,
  );
});
test("oversized streams fail honestly and JSON-only compatible servers still work", async () => {
  const large = createHttpTransport(
    { maxCharacters: 15 },
    fakeRequest((_req, reply) =>
      reply().end('{"message":{"content":"far too much data"},"done":true}\n'),
    ),
  );
  await assert.rejects(
    large(endpoint, { stream: true }, signal()),
    (e) =>
      /exceeds the limit/.test((e as Error).message) &&
      !/Cannot connect/.test((e as Error).message),
  );
  const compatible = createHttpTransport(
    {},
    fakeRequest((_req, reply) =>
      reply("application/json").end(
        '{"message":{"content":"whole response"},"done":true}',
      ),
    ),
  );
  assert.equal(
    ((await compatible(endpoint, { stream: true }, signal())) as any).message
      .content,
    "whole response",
  );
});
