import { readFile } from "node:fs/promises";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Attack from "../web/app/attack/page";

describe("attack checkbox layout", () => {
  it("groups the checkbox caption in its own wrapping element", () => {
    const html = renderToStaticMarkup(<Attack />);
    expect(html).toMatch(
      /<label class="checkbox"><input[^>]+\/><span>Inject a hidden instruction \(restores the sample\)<\/span><\/label>/,
    );
  });
  it("keeps the checkbox at its native size instead of the full panel width", async () => {
    const css = await readFile("web/app/globals.css", "utf8");
    expect(css).toMatch(
      /input\[type="checkbox"\]\s*\{[^}]*padding: 0;[^}]*border: 0;[^}]*width: 18px;[^}]*height: 18px;[^}]*flex-shrink: 0;/,
    );
    expect(css).toContain('.key-panel > label input:not([type="checkbox"])');
    expect(css).toMatch(
      /\.checkbox span\s*\{[^}]*min-width: 0;[^}]*overflow-wrap: anywhere;/,
    );
  });
});
