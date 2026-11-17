import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Home from "../web/app/page";
import { addressDiff } from "../web/app/components/landing/address-diff";
import { LedgerPanel, ledgerLabel } from "../web/app/components/landing/ledger-preview";
import { SiteFooter } from "../web/app/components/landing/site-footer";
import { Wallpaper } from "../web/app/components/landing/wallpaper";
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
        expect(different).toBe(
          address[index].toLowerCase() !== against[index].toLowerCase(),
        );
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
  it.each(["hero", "desk", "steel", "skyline", "footer", "colonnade"] as const)(
    "serves responsive local %s photography with appropriate loading priority",
    (scene) => {
      const html = renderToStaticMarkup(<Wallpaper scene={scene} />);
      expect(html).toContain(
        `media="(max-width: 767px)" srcSet="/walls/${scene}-sm.webp"`,
      );
      expect(html).toContain(`src="/walls/${scene}.webp"`);
      expect(html).toContain('decoding="async"');
      expect(html).toContain('aria-hidden="true"');
      expect(html).toContain('alt=""');
      expect(html).toContain(
        `loading="${scene === "hero" ? "eager" : "lazy"}"`,
      );
      if (scene === "hero") expect(html).toContain('fetchPriority="high"');
      else expect(html).not.toContain('fetchPriority="high"');
    },
  );

  it("renders the clearing desk and every story in a readable static version", () => {
    const html = renderToStaticMarkup(<Home />);
    expect(html.match(/<h1\b/g)).toHaveLength(1);
    expect(html).toContain("Let your agent");
    expect(html).toContain(
      'aria-label="Let your agent pay. Keep the last word."',
    );
    expect(html).toContain("Hi, I&#x27;m Clerk.");
    expect(html).toContain("I check every payment before it leaves.");
    expect(html).toContain("/clerk-hd/hi.webp");
    expect(html).toContain("/clerk-hd/present.webp");
    expect(html).not.toContain('class="eyebrow');
    expect(html).not.toContain('class="preview-strip"');
    for (const title of ["Read.", "Compare.", "Refuse."])
      expect(html).toContain(`<h3>${title}</h3>`);
    expect(html).not.toContain('data-animated="true"');
    expect(html).toContain(KOPI_PAGI);
    expect(html).toContain(KOPI_PAGI_LOOKALIKES[0]);
    expect(html).toContain("Illustrated sample");
    expect(html).toContain("Your move.");
    expect(html).toContain('href="/app/keys"');
    expect(html).toContain('href="/app#ledger"');
    for (const object of [
      "terminal",
      "stamp",
      "vault",
      "printer",
      "clerk-sticker",
    ])
      expect(html).toContain(`src="/objects/${object}.webp"`);
    expect(html).not.toContain('src="/plates/');
    expect(html).toContain('src="/clerk-hd/hi.webp" width="805" height="1100"');
    expect(html).not.toContain('src="/clerk/');
    expect(html).not.toContain('class="story-clerk"');
    for (const field of ["NDS-0142", "CLEARED RECEIPT", "verified", "44005"])
      expect(html).toContain(field);
    expect(html).toContain('role="switch" aria-checked="false"');
    expect(html).toContain("Interactive preview · no transaction");
    expect(html).not.toContain("7 on-chain scenarios");
  });
  it.each(["ready", "unavailable"] as const)(
    "keeps the %s ledger honest without fabricated rows",
    (status) => {
      const html = renderToStaticMarkup(
        <LedgerPanel rows={[]} status={status} />,
      );
      expect(html).toContain("No vault events yet.");
      expect(html).toContain("/clerk-hd/tablet.webp");
      expect(html).not.toContain("Refreshes when you reload.");
      expect(html).not.toContain("spinner-dot");
      expect(html).toContain("View the vault on the Aevum explorer");
      expect(html).toContain(
        'href="https://explorer-test.qday.info/address/0x8fba7dd67e294b3ba5ca164748b9f41c03bad13c"',
      );
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
    expect(html).not.toContain("Waiting for the first on-chain run.");
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
    expect(html).toMatch(/Refused<\/span><\/td><td>—<\/td><td>—<\/td>/);
    expect(html).toContain('href="https://explorer-test.qday.info/tx/test-rejected"');
    expect(html).toContain("/clerk-hd/tablet.webp");
    expect(html).not.toContain("No vault events yet.");
  });
});

describe("ledger labels", () => {
  it("names every vault event in plain words", () => {
    expect(ledgerLabel({ event: "Paid" })).toBe("Paid");
    expect(ledgerLabel({ event: "Rejected", reason: "Name mismatch" })).toBe("Refused");
    expect(ledgerLabel({ event: "Staged" })).toBe("Batch staged");
    expect(ledgerLabel({ event: "AgentConfigured" })).toBe("Agent key granted");
    expect(ledgerLabel({ event: "AgentRevoked" })).toBe("Agent key revoked");
    expect(ledgerLabel({ event: "FreezeChanged", frozen: true })).toBe("Kill switch on");
    expect(ledgerLabel({ event: "FreezeChanged", frozen: false })).toBe("Kill switch off");
    expect(ledgerLabel({ event: "Something" })).toBe("Something");
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
    expect(html).toContain('src="/clerk-hd/peek.webp"');
    expect(html).toContain("Live on Aevum testnet");
    expect(html).toContain('class="footer-wordmark" aria-hidden="true"');
  });
});
