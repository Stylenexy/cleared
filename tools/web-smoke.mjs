import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  KOPI_PAGI,
  KERTAS_KITA,
  KOPI_PAGI_LOOKALIKES,
} from "../web/lib/sample-addresses.ts";
const port = Number(process.env.CLEARED_SMOKE_PORT ?? 3000);
assert.ok(Number.isInteger(port) && port >= 1024 && port <= 65535);
const base = `http://127.0.0.1:${port}`;
for (const [route, copy] of [
  ["/", "Your agent reads the invoice."],
  ["/app", "Treasury desk."],
  ["/app/keys", "Agent controls."],
  ["/try", "Try Cleared."],
  ["/attack", "Try to redirect the invoice."],
]) {
  const response = await fetch(base + route);
  assert.equal(response.status, 200);
  const html = await response.text();
  const csp = response.headers.get("content-security-policy");
  assert.ok(csp, route + " CSP");
  assert.ok(csp.includes("frame-ancestors 'none'"));
  assert.ok(!csp.includes("unsafe-eval"));
  const nonce = csp.match(/'nonce-([^']+)'/)?.[1];
  assert.ok(nonce, route + " nonce policy");
  const scripts = [...html.matchAll(/<script\b([^>]*)>/g)];
  assert.ok(scripts.length, route + " hydration scripts");
  for (const [, attributes] of scripts)
    assert.ok(attributes.includes(`nonce="${nonce}"`), route + " script nonce");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("referrer-policy"), "no-referrer");
  assert.ok(
    response.headers
      .get("strict-transport-security")
      ?.includes("max-age=31536000"),
  );
  assert.ok(response.headers.get("cache-control")?.includes("no-store"));
  assert.ok(html.includes(copy), route);
  assert.ok(html.includes('lang="en"'));
  assert.ok(!/pa[g]ar/i.test(html));
}
const config = await fetch(base + "/api/config").then((r) => r.json());
const secondHome = await fetch(base);
const thirdHome = await fetch(base);
assert.notEqual(
  secondHome.headers.get("content-security-policy"),
  thirdHome.headers.get("content-security-policy"),
);
for (const route of ["config", "attack", "parse"]) {
  const forbidden = await fetch(base + "/api/" + route, {
    method: route === "config" ? "GET" : "POST",
    headers: { Origin: "https://attacker.example" },
  });
  assert.equal(forbidden.status, 403, route + " origin");
  assert.equal(forbidden.headers.get("access-control-allow-origin"), null);
}
assert.equal(config.network, "demo");
assert.equal(config.chainId, 44005);
assert.equal(config.vault, undefined);
assert.equal(config.llmAvailable, false);
for (const name of [
  "favicon.svg",
  "cleared-mark.svg",
  "og.png",
  "apple-touch-icon.png",
  "fonts/archivo-wide.woff2",
  "fonts/manrope-latin.woff2",
  "samples/01-kopi.txt",
  "samples/02-kertas.txt",
  "samples/03-beracun.txt",
  "samples/invoices.csv",
  "samples/01-kopi.pdf",
  "samples/02-kertas.pdf",
  "samples/03-beracun.pdf",
]) {
  const response = await fetch(base + "/" + name);
  assert.equal(response.status, 200, name);
  const served = Buffer.from(await response.arrayBuffer());
  const source = await readFile("web/public/" + name);
  const mirror = await readFile("public/" + name);
  assert.deepEqual(served, source, name + " served source");
  assert.deepEqual(mirror, source, name + " root build mirror");
}
const home = await fetch(base).then((r) => r.text());
assert.ok(home.includes(`aria-label="${KOPI_PAGI}"`));
assert.ok(home.includes(`aria-label="${KOPI_PAGI_LOOKALIKES[0]}"`));
const cssUrls = [...home.matchAll(/href="([^\"]+\.css[^\"]*)"/g)].map(
  (m) => m[1],
);
const css = (
  await Promise.all(
    cssUrls.map((url) =>
      fetch(base + url.replaceAll("&amp;", "&")).then((r) => r.text()),
    ),
  )
).join("\n");
assert.match(css, /navigation:\s*auto/);
assert.match(css, /prefers-reduced-motion/);
assert.match(home, /view-transition-name:\s*clearing-document/);
assert.ok(!home.includes("eyebrow"));
const form = new FormData();
for (const name of ["01-kopi", "02-kertas", "03-beracun"])
  form.append(
    "files",
    new File(
      [await readFile("web/public/samples/" + name + ".pdf")],
      name + ".pdf",
    ),
  );
const response = await fetch(base + "/api/parse", {
  method: "POST",
  body: form,
});
const parsed = await response.json();
assert.equal(response.status, 200, JSON.stringify(parsed));
assert.equal(parsed.invoices.length, 3);
assert.deepEqual(
  parsed.invoices.map((invoice) => invoice.payee),
  [KOPI_PAGI, KERTAS_KITA, KOPI_PAGI_LOOKALIKES[0]],
);
const { attackText, lookalikes } = await import("../web/lib/attack-samples.ts");
const attack = await fetch(base + "/api/attack", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ text: attackText(lookalikes[0], true), live: false }),
});
const data = await attack.json();
assert.equal(attack.status, 200, JSON.stringify(data));
assert.equal(data.rejected, true);
assert.equal(data.extractionSource, "cached-sample");
assert.equal(data.decisionSource, "sample-policy-simulation");
assert.equal(data.decision, "Name mismatch");
console.log(
  "Production HTTP smoke PASS: 5 English pages, CSP/nonces and security headers, API origin rejections, demo config, public assets and root mirror, transition/reduced-motion CSS, 3 PDF uploads, cached attack rejected. No browser or transaction.",
);
