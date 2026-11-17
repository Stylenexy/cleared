import { spawn, spawnSync } from "node:child_process";
import { mkdir, access } from "node:fs/promises";
import { createServer } from "node:net";
import path from "node:path";
import { existsSync } from "node:fs";
const root = process.cwd();
const foundry =
  process.platform === "win32"
    ? path.join(process.env.USERPROFILE, ".foundry/bin")
    : "";
const binary = (name) =>
  name === "forge" &&
  existsSync(
    path.join(
      root,
      ".local/bin",
      name + (process.platform === "win32" ? ".exe" : ""),
    ),
  )
    ? path.join(
        root,
        ".local/bin",
        name + (process.platform === "win32" ? ".exe" : ""),
      )
    : process.platform === "win32"
      ? path.join(foundry, name + ".exe")
      : name;
await mkdir(".local", { recursive: true });
// Refuse an occupied port; never attach to, reset, or stop a user's existing node.
await new Promise((resolve, reject) => {
  const probe = createServer();
  probe.once("error", () =>
    reject(
      new Error(
        "Port 8545 is occupied. Stop that node yourself or use another workspace.",
      ),
    ),
  );
  probe.listen(8545, "127.0.0.1", () => probe.close(resolve));
});
try {
  await access("tools/solc.exe");
} catch {
  const r = spawnSync(process.execPath, ["tools/setup-solc.mjs"], {
    stdio: "inherit",
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
const built = spawnSync(binary("forge"), ["build"], { stdio: "inherit" });
if (built.status !== 0) process.exit(built.status ?? 1);
const node = spawn(
  binary("anvil"),
  [
    "--host",
    "127.0.0.1",
    "--port",
    "8545",
    "--chain-id",
    "31337",
    "--hardfork",
    "shanghai",
    "--silent",
  ],
  { stdio: "ignore", windowsHide: true },
);
let web;
let stopping = false;
function stop() {
  if (stopping) return;
  stopping = true;
  web?.kill();
  node.kill();
}
process.once("SIGINT", () => {
  stop();
  process.exit(0);
});
process.once("SIGTERM", () => {
  stop();
  process.exit(0);
});
process.once("exit", stop);
process.stdin.on("data", (data) => {
  if (data.toString().trim() === "stop") {
    stop();
    process.exit(0);
  }
});
node.on("error", (e) => {
  console.error(e.message);
  stop();
  process.exitCode = 1;
});
try {
  let ready = false;
  for (let i = 0; i < 80; i++) {
    try {
      const r = await fetch("http://127.0.0.1:8545", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "eth_chainId",
          params: [],
        }),
      });
      if ((await r.json()).result === "0x7a69") {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  if (!ready) throw new Error("Anvil did not become ready.");
  const deployed = spawnSync(process.execPath, ["tools/local-deploy.mjs"], {
    stdio: "inherit",
  });
  if (deployed.status !== 0) throw new Error("Local setup failed.");
  if (process.argv.includes("--no-web")) {
    console.log(
      "Anvil ready. Start web separately with npm run dev. Ctrl+C stops this node.",
    );
  } else {
    console.log(
      "Opening local service at http://127.0.0.1:3000 (no browser launched).",
    );
    web = spawn(
      process.execPath,
      ["../node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1"],
      {
        cwd: path.join(root, "web"),
        stdio: "inherit",
        env: {
          ...process.env,
          CLEARED_NETWORK: "local",
          NEXT_TELEMETRY_DISABLED: "1",
        },
        windowsHide: true,
      },
    );
    web.on("exit", (code) => {
      stop();
      process.exitCode = code ?? 0;
    });
  }
} catch (e) {
  console.error(e.message);
  stop();
  process.exitCode = 1;
}
