import { cp, mkdir } from "node:fs/promises";

// Vercel's Next builder collects public assets relative to its root entrypoint.
// Keep web/public authoritative; mirror it after the workspace build without deletion.
await mkdir("public", { recursive: true });
await cp("web/public", "public", { recursive: true, force: true });
console.log("Prepared root public assets from web/public.");
