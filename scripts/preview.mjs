import { build } from "esbuild";
import { mkdir, copyFile } from "node:fs/promises";
await mkdir(".preview", { recursive: true });
await build({
  entryPoints: ["scripts/preview.ts"],
  bundle: true,
  format: "iife",
  platform: "browser",
  outfile: ".preview/preview.js",
});
await copyFile("styles.css", ".preview/styles.css");
await copyFile("scripts/preview.html", ".preview/index.html");
await build({
  entryPoints: ["scripts/scripts-preview.ts"],
  bundle: true,
  format: "iife",
  platform: "browser",
  outfile: ".preview/scripts-preview.js",
  plugins: [
    {
      name: "outline-host",
      setup(b) {
        b.onResolve({ filter: /^obsidian$/ }, () => ({
          path: new URL("./obsidian-preview.ts", import.meta.url).pathname,
        }));
      },
    },
  ],
});
const { readFile, writeFile } = await import("node:fs/promises");
let html = await readFile("scripts/preview.html", "utf8");
html = html
  .replace("preview.js", "scripts-preview.js")
  .replace("<title>", "<title>Scripts · ");
html = html.replace(
  "</head>",
  `<style>
:root { --font-ui-smaller: 11px; --font-ui-medium: 15px; --font-semibold: 600; --text-warning: #ad7420; --background-modifier-hover: #8b5cf617; }
.host { grid-template-columns: 320px minmax(200px,1fr); } .files { display:none; }
.sidebar-host { grid-column:1; grid-row:1; background:var(--background-secondary); border-right:1px solid var(--background-modifier-border); overflow:auto; }
.note { grid-column:2; grid-row:1; } #sidebar { min-height:100%; }
.preview-label {left:auto;right:18px;bottom:8px;text-align:right;pointer-events:none;}
</style></head>`,
);
html = html.replace(
  /<main class="note">[\s\S]*?<\/main>/,
  `<main class="note"><div class="breadcrumb">Projects / Copper Sky / Scripts</div><h1>Opening</h1><p>Native Obsidian editing stays in the main pane.</p><h2>Page 1</h2><blockquote><b>The arrival</b><p>A courier waits beneath the observatory.</p></blockquote><p><b>MIRA:</b> Is anyone here?</p><h2>Page 2–3 · Double Spread</h2><p>The archive fills both pages.</p><div id="notice"></div></main>`,
);
await writeFile(".preview/scripts.html", html);
await build({entryPoints:["scripts/workspace-preview.ts"],bundle:true,format:"iife",platform:"browser",outfile:".preview/workspace-preview.js",plugins:[{name:"workspace-host",setup(b){b.onResolve({filter:/^obsidian$/},()=>({path:new URL("./obsidian-preview.ts",import.meta.url).pathname}));}}]});
await copyFile("scripts/workspace-preview.html",".preview/workspace.html");
