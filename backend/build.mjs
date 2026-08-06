import { build } from "esbuild";
import { rmSync } from "node:fs";

// Clean previous output
rmSync("dist", { recursive: true, force: true });

await build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  platform: "node",
  target: "node22",
  format: "esm",
  outfile: "dist/index.mjs",
  sourcemap: true,
  // Keep node_modules packages external — the host installs them via
  // `npm install`, and native modules (bcrypt) must never be bundled.
  packages: "external",
});

console.log("✓ Backend built → dist/index.mjs");
