import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  compareAddress,
  poisonAddress,
} from "../web/app/components/landing/address-diff";
import { AddressComparison } from "../web/app/components/landing/address-comparison";
import { TryClerk } from "../web/app/components/landing/try-clerk";
import { KOPI_PAGI, KOPI_PAGI_LOOKALIKES } from "../web/lib/sample-addresses";

describe("local registry preview", () => {
  it.each([KOPI_PAGI, KOPI_PAGI.toLowerCase(), KOPI_PAGI.toUpperCase()])(
    "clears an exact or case-insensitive registered destination: %s",
    (address) =>
      expect(compareAddress(address, KOPI_PAGI)).toEqual({
        valid: true,
        differences: 0,
        matches: true,
      }),
  );

  it("counts differing positions instead of casing changes", () => {
    const candidate =
      KOPI_PAGI.slice(0, 6) + "0000" + KOPI_PAGI.slice(10).toLowerCase();
    expect(compareAddress(candidate, KOPI_PAGI)).toEqual({
      valid: true,
      differences: 3,
      matches: false,
    });
    expect(compareAddress(KOPI_PAGI_LOOKALIKES[0], KOPI_PAGI)).toEqual({
      valid: true,
      differences: 30,
      matches: false,
    });
  });

  it.each([
    "",
    "0x123",
    KOPI_PAGI + "a",
    KOPI_PAGI.replace("166", "z66"),
    ` ${KOPI_PAGI}`,
    KOPI_PAGI.slice(2),
  ])("rejects malformed input: %s", (address) => {
    const result = compareAddress(address, KOPI_PAGI);
    expect(result.valid).toBe(false);
    expect(result.matches).toBe(false);
  });

  it("counts missing characters as differences", () => {
    expect(compareAddress(KOPI_PAGI.slice(0, -2), KOPI_PAGI).differences).toBe(
      2,
    );
  });

  it("generates valid new lookalikes preserving the first 6 and last 4 characters", () => {
    let previous: string = KOPI_PAGI;
    for (let index = 0; index < 100; index++) {
      const candidate = poisonAddress(KOPI_PAGI, previous);
      expect(candidate.slice(0, 6)).toBe(KOPI_PAGI.slice(0, 6));
      expect(candidate.slice(-4)).toBe(KOPI_PAGI.slice(-4));
      expect(candidate.toLowerCase()).not.toBe(previous.toLowerCase());
      expect(compareAddress(candidate, KOPI_PAGI)).toMatchObject({
        valid: true,
        matches: false,
      });
      previous = candidate;
    }
  });

  it("avoids both the registered and previous address even when random output collides", () => {
    const digits = Array.from(KOPI_PAGI.slice(6, -4), (digit) =>
      parseInt(digit, 16),
    );
    const generator = () => {
      let index = 0;
      return () => digits[index++];
    };
    const previous = poisonAddress(KOPI_PAGI, "", generator());
    const next = poisonAddress(KOPI_PAGI, previous, generator());
    expect(next.toLowerCase()).not.toBe(KOPI_PAGI.toLowerCase());
    expect(next.toLowerCase()).not.toBe(previous.toLowerCase());
  });

  it("renders an accessible editable preview with honest local-only copy", () => {
    const html = renderToStaticMarkup(<TryClerk />);
    expect(html).toContain(`value="${KOPI_PAGI_LOOKALIKES[0]}"`);
    expect(html).toContain('maxLength="42"');
    expect(html).toContain('for="clerk-address"');
    expect(html).toContain('role="status"');
    expect(html).toContain("Poison it");
    expect(html).toContain("Use the real address");
    expect(html).toContain("Refused. 30 characters differ");
    expect(html).toContain("Local preview of the registry rule.");
    expect(html).toContain('href="/attack"');
  });

  it("compares complete addresses as text without link semantics", () => {
    const html = renderToStaticMarkup(
      <AddressComparison
        registered={KOPI_PAGI}
        candidate={KOPI_PAGI.toLowerCase()}
      />,
    );
    expect(html).not.toContain('data-different="true"');
    expect(html).not.toContain("<a");
    expect(html).toContain(KOPI_PAGI);
  });
});
