import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const base = "http://127.0.0.1:3000";
for (const [route, copy] of [
  ["/", "Invoice boleh salah."],
  ["/app", "Meja bendahara."],
  ["/app/keys", "Kunci agen, batas jelas."],
]) {
  const response = await fetch(base + route);
  assert.equal(response.status, 200);
  assert.ok((await response.text()).includes(copy));
}
const config = await fetch(base + "/api/config").then((r) => r.json());
assert.equal(config.network, "local");
assert.equal(config.chainId, 31337);
assert.match(config.vault, /^0x/);
assert.equal(config.llmAvailable, false);
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
assert.equal(
  parsed.invoices[2].payee,
  "0x1111111111111111111111111111111111111112",
);
console.log(
  "Production HTTP smoke PASS: 3 pages, local config, 3 PDF invoices. No browser launched.",
);
