import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { getAddress, isAddress, keccak256, stringToHex } from "viem";
import {
  KOPI_PAGI,
  KERTAS_KITA,
  KOPI_PAGI_LOOKALIKES,
  KERTAS_KITA_UPDATED,
  SAMPLE_ADDRESS_SEEDS,
} from "../web/lib/sample-addresses";
import { demoVerified } from "../web/lib/demo";
import { parseCsv, parseInvoice } from "../web/lib/invoices";

const derive = (seed: string) =>
  getAddress(`0x${keccak256(stringToHex(seed)).slice(-40)}`);
const addresses = [
  KOPI_PAGI,
  KERTAS_KITA,
  ...KOPI_PAGI_LOOKALIKES,
  KERTAS_KITA_UPDATED,
];

describe("public sample destinations", () => {
  it.each(addresses)("has a valid EIP-55 checksum: %s", (address) => {
    expect(isAddress(address, { strict: true })).toBe(true);
    expect(getAddress(address.toLowerCase())).toBe(address);
  });
  it("reproduces legitimate sample addresses from the documented public seeds", () => {
    expect(derive(SAMPLE_ADDRESS_SEEDS.KOPI_PAGI)).toBe(KOPI_PAGI);
    expect(derive(SAMPLE_ADDRESS_SEEDS.KERTAS_KITA)).toBe(KERTAS_KITA);
    expect(derive(SAMPLE_ADDRESS_SEEDS.KERTAS_KITA_UPDATED)).toBe(
      KERTAS_KITA_UPDATED,
    );
    expect(
      new Set(addresses.map((address) => address.toLowerCase())).size,
    ).toBe(addresses.length);
  });
  it.each(
    KOPI_PAGI_LOOKALIKES.map((address, n) => ({
      address,
      seed: SAMPLE_ADDRESS_SEEDS.KOPI_PAGI_LOOKALIKES[n],
    })),
  )(
    "reproduces a poisoning sample with identical visible edges: $address",
    ({ address, seed }) => {
      expect(
        getAddress(
          KOPI_PAGI.slice(0, 6) +
            derive(seed).slice(6, -4) +
            KOPI_PAGI.slice(-4),
        ),
      ).toBe(address);
      expect(address.slice(2, 6)).toBe(KOPI_PAGI.slice(2, 6));
      expect(address.slice(-4)).toBe(KOPI_PAGI.slice(-4));
      expect(address.slice(6, -4).toLowerCase()).not.toBe(
        KOPI_PAGI.slice(6, -4).toLowerCase(),
      );
      expect(demoVerified({ name: "Northwind Design Studio", payee: address })).toBe(false);
    },
  );
  it("verifies legitimate names case-insensitively by address and refuses swapped names", () => {
    for (const [name, address] of [
      ["Northwind Design Studio", KOPI_PAGI],
      ["Ledgerline Audits", KERTAS_KITA],
    ] as const) {
      expect(
        demoVerified({ name, payee: address.toLowerCase() as typeof address }),
      ).toBe(true);
    }
    expect(demoVerified({ name: "Northwind Design Studio", payee: KERTAS_KITA })).toBe(false);
    expect(
      demoVerified({ name: "Ledgerline Audits", payee: KERTAS_KITA_UPDATED }),
    ).toBe(false);
  });
  it("keeps TXT and CSV samples consistent with the source module", async () => {
    const csv = parseCsv(
      await readFile("web/public/samples/invoices.csv", "utf8"),
    );
    const expected = [KOPI_PAGI, KERTAS_KITA, KOPI_PAGI_LOOKALIKES[0]];
    for (const [n, filename] of [
      "01-kopi",
      "02-kertas",
      "03-beracun",
    ].entries()) {
      const txt = await parseInvoice(
        await readFile(`web/public/samples/${filename}.txt`, "utf8"),
      );
      expect(txt.payee).toBe(expected[n]);
      expect(csv[n].payee).toBe(txt.payee);
      expect(csv[n].ref).toBe(txt.ref);
      expect(csv[n].amount).toBe(txt.amount);
    }
  });
  it("keeps generated Foundry constants consistent with the source module", async () => {
    const source = await readFile("contracts/test/SampleAddresses.sol", "utf8");
    expect(
      [
        ...source.matchAll(
          /address internal constant \w+ = (0x[0-9a-fA-F]{40});/g,
        ),
      ].map((m) => m[1]),
    ).toEqual(addresses);
  });
  it("labels regenerated exports as simulations without reusing historical receipts", async () => {
    const proof = JSON.parse(await readFile("docs/local-proof.json", "utf8"));
    expect(proof.network).toBe("Sample simulation only");
    expect(proof.notice).toContain("No transaction sent");
    expect(proof.rows.map((row: { payee: string }) => row.payee)).toEqual([
      KOPI_PAGI,
      KERTAS_KITA,
      KOPI_PAGI_LOOKALIKES[0],
    ]);
    expect(proof.rows.map((row: { status: string }) => row.status)).toEqual([
      "Simulated Paid",
      "Simulated Paid",
      "Simulated Name mismatch",
    ]);
    expect(JSON.stringify(proof)).not.toMatch(
      /transactionHash|stageHash|executeHash|poisonBalance/,
    );
  });
});
