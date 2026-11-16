import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const platform =
  process.platform === "win32"
    ? "windows-amd64"
    : process.platform === "darwin"
      ? "macosx-amd64"
      : "linux-amd64";
const base = `https://binaries.soliditylang.org/${platform}`;
const list = await fetch(`${base}/list.json`).then((r) => r.json());
const build = list.builds.find((b) => b.path === list.releases["0.8.28"]);
const bytes = Buffer.from(
  await fetch(`${base}/${build.path}`).then((r) => r.arrayBuffer()),
);
if (`0x${createHash("sha256").update(bytes).digest("hex")}` !== build.sha256)
  throw new Error("Compiler checksum mismatch");
await mkdir("tools", { recursive: true });
await writeFile("tools/solc.exe", bytes, { mode: 0o755 });
console.log("Solidity 0.8.28 installed in workspace; SHA-256 verified.");
