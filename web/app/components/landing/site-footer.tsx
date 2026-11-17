import { BrandImage } from "../brand";

import { Clerk } from "./clerk";

const REPOSITORY_URL = "https://github.com/Stylenexy/cleared";
const columns = [
  {
    title: "Product",
    links: [
      ["Try it", "/try"],
      ["Attack lab", "/attack"],
      ["Treasury", "/app"],
      ["Controls", "/app/keys"],
    ],
  },
  {
    title: "Developers",
    links: [
      ["Source code", REPOSITORY_URL],
      ["SDK", REPOSITORY_URL],
      ["Testnet proof", `${REPOSITORY_URL}/blob/main/docs/TESTNET-PROOF.md`],
    ],
  },
  {
    title: "Aevum",
    links: [
      [
        "Vault on explorer",
        "https://explorer-test.qday.info/address/0x8fba7dd67e294b3ba5ca164748b9f41c03bad13c",
      ],
      ["Starter kit", "https://github.com/qday-io/aevum-starter-kit"],
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-peek" aria-hidden="true">
        <Clerk pose="peek" />
      </div>
      <div className="site-footer-grid">
        <div className="footer-brand">
          <a className="wordmark" href="/" aria-label="Cleared home">
            <BrandImage footer />
            Cleared
          </a>
          <p>Let your agent pay. Keep the last word.</p>
          <span className="footer-status">
            <span className="live-dot" aria-hidden="true" />
            Live on Aevum testnet
          </span>
        </div>
        {columns.map(({ title, links }) => (
          <div className="footer-column" key={title}>
            <h2>{title}</h2>
            <ul>
              {links.map(([label, href]) => (
                <li key={label}>
                  <a
                    href={href}
                    {...(href.startsWith("https:")
                      ? { target: "_blank", rel: "noreferrer" }
                      : {})}
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="footer-bottom">
        <span>Testnet prototype. Not audited. Test tokens only.</span>
        <span>Aevum Builder Challenge #1</span>
      </div>
      <div className="footer-wordmark" aria-hidden="true">
        CLEARED
      </div>
    </footer>
  );
}
