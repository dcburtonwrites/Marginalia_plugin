import { mkdir, copyFile } from "node:fs/promises";
const root = "dist/marginalia";
await mkdir(root, { recursive: true });
for (const file of ["main.js", "manifest.json", "styles.css"])
  await copyFile(file, root + "/" + file);
console.log(
  "Development plugin files prepared in dist/marginalia. No vault was modified.",
);
