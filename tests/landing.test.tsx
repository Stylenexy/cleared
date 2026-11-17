import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Home from "../web/app/page";
import { addressDiff } from "../web/app/components/landing/address-diff";
import { LedgerPanel } from "../web/app/components/landing/ledger-preview";
import { SiteFooter } from "../web/app/components/landing/site-footer";
import { KOPI_PAGI, KOPI_PAGI_LOOKALIKES } from "../web/lib/sample-addresses";

describe("landing address comparison", () => {
  it("marks exactly the differing characters in both complete sample addresses", () => {
    const lookalike = KOPI_PAGI_LOOKALIKES[0];
    for (const [address, against] of [
      [KOPI_PAGI, lookalike],
      [lookalike, KOPI_PAGI],
    ]) {
      const diff = addressDiff(address, against);
      expect(diff.map(({ character }) => character).join("")).toBe(address);
      expect(diff).toHaveLength(42);
      diff.forEach(({ different }, index) => {
        expect(different).toBe(address[index] !== against[index]);
        if (index < 6 || index >= 38) expect(different).toBe(false);
      });
      expect(diff.some(({ different }) => different)).toBe(true);
    }
  });
  it("leaves an identical address unmarked", () => {
    expect(
      addressDiff(KOPI_PAGI, KOPI_PAGI).every(({ different }) => !different),
    ).toBe(true);
  });
});

describe("landing content", () => {
  it("renders a readable four-step story and full sample addresses before hydration", () => {
    const html = renderToStaticMarkup(<Home />);
    expect(html.match(/<h1\b/g)).toHaveLength(1);
    expect(html).toContain('aria-hidden="true">CLEARED</div>');
    expect(html).toContain("Your AI can read the invoice.");
    for (const title of [
      "Read the invoice.",
      "Follow the address.",
      "Compare every character.",
      "Refuse the destination.",
    ]) {
      expect(html).toContain(`<h3>${title}</h3>`);
    }
    expect(html).toContain('data-pinned="false"');
    expect(html).toContain(KOPI_PAGI);
    expect(html).toContain(KOPI_PAGI_LOOKALIKES[0]);
    expect(html).toContain("Illustrated sample");
    expect(html).toContain("Sample decisions");
    expect(html).toContain('href="/app/keys"');
    expect(html).toContain('href="/app#ledger"');
  });
  it.each(["ready", "unavailable"] as const)(
    "keeps the %s ledger honest without fabricated rows",
    (status) => {
      const html = renderToStaticMarkup(
        <LedgerPanel rows={[]} status={status} />,
      );
      expect(html).toContain(
        "No payments recorded yet. The testnet proof run fills this ledger.",
      );
      expect(html).toContain("/clerk/clerk-standby.webp");
      expect(html).not.toContain("tUSD8");
      expect(html).not.toContain("ledger-event");
      if (status === "unavailable")
        expect(html).toContain("No payment history could be loaded.");
    },
  );
  it("keeps loading distinct from an empty ledger", () => {
    const html = renderToStaticMarkup(
      <LedgerPanel rows={[]} status="loading" />,
    );
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("Reading the Aevum ledger");
    expect(html).not.toContain("No payments recorded yet.");
  });
  it("renders real decision fields without inventing absent rejection fields", () => {
    const html = renderToStaticMarkup(
      <LedgerPanel
        status="ready"
        rows={[
          {
            event: "Paid",
            payee: KOPI_PAGI,
            amount: "0.15",
            block: "10",
            txHash: "test-paid",
            logIndex: 0,
          },
          {
            event: "Rejected",
            reason: "NameMismatch",
            block: "9",
            txHash: "test-rejected",
            logIndex: 1,
          },
        ]}
      />,
    );
    expect(html).toContain("0.15 tUSD8");
    expect(html).toContain(`title="${KOPI_PAGI}"`);
    expect(html).toContain("0x166F…1d5A");
    expect(html).toContain("NameMismatch");
    expect(html).toMatch(/Rejected<\/span><\/td><td>—<\/td><td>—<\/td>/);
    expect(html).toContain("/clerk/clerk-tablet.webp");
    expect(html).not.toContain("No payments recorded yet.");
  });
});

describe("shared footer", () => {
  it("provides all product and evidence links, with safe external-link attributes", () => {
    const html = renderToStaticMarkup(<SiteFooter />);
    for (const route of ["/try", "/attack", "/app", "/app/keys"])
      expect(html).toContain(`href="${route}"`);
    for (const url of [
      "https://github.com/Stylenexy/cleared",
      "https://github.com/Stylenexy/cleared/blob/main/docs/TESTNET-PROOF.md",
      "https://explorer-test.qday.info/address/0x8fba7dd67e294b3ba5ca164748b9f41c03bad13c",
      "https://github.com/qday-io/aevum-starter-kit",
    ])
      expect(html).toContain(`href="${url}" target="_blank" rel="noreferrer"`);
    expect(html).toContain("Testnet prototype. Not audited. Test tokens only.");
    expect(html).toContain("Aevum Builder Challenge #1");
    expect(html).toContain('src="/mark-3d.webp"');
  });
});
