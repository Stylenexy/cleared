import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ComparedAddress } from "../web/app/components/invoice-theatre";
import { KOPI_PAGI, KOPI_PAGI_LOOKALIKES } from "../web/lib/sample-addresses";

describe("scene character comparison", () => {
  it.each(KOPI_PAGI_LOOKALIKES)(
    "highlights every differing character for %s",
    (address) => {
      for (const [value, against] of [
        [address, KOPI_PAGI],
        [KOPI_PAGI, address],
      ]) {
        const html = renderToStaticMarkup(
          <ComparedAddress address={value} against={against} />,
        );
        const characters = [
          ...html.matchAll(/<span( class="changed-digit")?>(.)<\/span>/g),
        ];
        expect(characters).toHaveLength(value.length);
        characters.forEach((match, n) => {
          expect(match[2]).toBe(value[n]);
          expect(Boolean(match[1])).toBe(value[n] !== against[n]);
          if (n < 6 || n >= value.length - 4) expect(match[1]).toBeUndefined();
        });
      }
    },
  );
  it("leaves matching and inactive addresses unhighlighted", () => {
    expect(
      renderToStaticMarkup(
        <ComparedAddress address={KOPI_PAGI} against={KOPI_PAGI} />,
      ),
    ).not.toContain("changed-digit");
    expect(
      renderToStaticMarkup(
        <ComparedAddress
          address={KOPI_PAGI_LOOKALIKES[0]}
          against={KOPI_PAGI}
          active={false}
        />,
      ),
    ).not.toContain("changed-digit");
  });
});
