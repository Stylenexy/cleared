import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import path from "node:path";
// A portable official version avoids Windows restricted-token profile lookup in 1.5.x builds.
const version = "v1.2.3";
const platform =
  process.platform === "win32"
    ? "win32"
    : process.platform === "darwin"
      ? "darwin"
      : "linux";
const arch = process.arch === "arm64" ? "arm64" : "amd64";
const ext = platform === "win32" ? "zip" : "tar.gz";
const name = `foundry_${version}_${platform}_${arch}.${ext}`;
const release = await fetch(
  `https://api.github.com/repos/foundry-rs/foundry/releases/tags/${version}`,
).then((r) => r.json());
const asset = release.assets?.find((a) => a.name === name);
if (!asset?.digest?.startsWith("sha256:"))
  throw new Error("Missing official release SHA-256.");
const response = await fetch(asset.browser_download_url);
if (!response.ok) throw new Error("Foundry download failed.");
const bytes = Buffer.from(await response.arrayBuffer());
if (
  "sha256:" + createHash("sha256").update(bytes).digest("hex") !==
  asset.digest
)
  throw new Error("Foundry checksum mismatch.");
await mkdir(".local/bin", { recursive: true });
const archive = path.resolve(".local", name);
await writeFile(archive, bytes);
const result =
  platform === "win32"
    ? spawnSync(
        "powershell.exe",
        [
          "-NoProfile",
          "-Command",
          "Expand-Archive -LiteralPath $env:PAGAR_FOUNDRY_ARCHIVE -DestinationPath $env:PAGAR_FOUNDRY_DESTINATION -Force",
        ],
        {
          stdio: "inherit",
          windowsHide: true,
          env: {
            ...process.env,
            PAGAR_FOUNDRY_ARCHIVE: archive,
            PAGAR_FOUNDRY_DESTINATION: path.resolve(".local/bin"),
          },
        },
      )
    : spawnSync("tar", ["-xzf", archive, "-C", path.resolve(".local/bin")], {
        stdio: "inherit",
      });
if (result.status !== 0) throw new Error("Foundry extraction failed.");
console.log(
  `Official Foundry ${version} installed in .local/bin; SHA-256 verified.`,
);
