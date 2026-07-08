// Copies the generated OpenAPI schema declarations into dist/ so that
// consumers of the built package can resolve the `./generated/schema` types.
// tsc does not emit input .d.ts files to outDir, so we copy them manually.
import { cp, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const src = path.join(root, "src", "generated");
const dest = path.join(root, "dist", "generated");

await mkdir(dest, { recursive: true });
await cp(src, dest, { recursive: true });
console.log("copied generated schema -> dist/generated");
