import { build } from "esbuild";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
await mkdir(".preview", { recursive: true });
await build({
  entryPoints: ["tests/host.test.ts"],
  bundle: true,
  platform: "node",
  format: "cjs",
  outfile: ".preview/host.test.cjs",
  loader: { ".md": "text" },
  plugins: [
    {
      name: "synthetic-host",
      setup(b) {
        b.onResolve({ filter: /^obsidian$/ }, () => ({
          path: resolve("tests/obsidian-mock.ts"),
        }));
        b.onResolve({ filter: /^\.\/ollama\.ts$/ }, () => ({
          path: resolve("tests/ollama-mock.ts"),
        }));
      },
    },
  ],
});
const result = spawnSync(
  process.execPath,
  ["--test", ".preview/host.test.cjs"],
  { stdio: "inherit" },
);
process.exitCode = result.status ?? 1;
