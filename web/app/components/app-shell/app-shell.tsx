"use client";

import Link from "next/link";
import type { Config } from "../../../lib/client";
import { BrandMark } from "../brand";

const navigation = [
  { href: "/try", label: "Try it", path: "M3 5h18v14H3z M3 6l9 7 9-7" },
  {
    href: "/attack",
    label: "Attack lab",
    path: "M9 3h6 M10 3v7L4 20h16l-6-10V3 M8 14h8",
  },
  {
    href: "/app",
    label: "Treasury",
    path: "m3 7 9-4 9 4-9 4-9-4Z M3 12l9 4 9-4 M3 17l9 4 9-4",
  },
  {
    href: "/app/keys",
    label: "Controls",
    path: "M3 6h18 M3 18h18 M3 12h18 M7 3v6 M17 9v6 M9 15v6",
  },
];

function NetworkStatus({
  config,
  frozen,
}: {
  config?: Config;
  frozen?: boolean;
}) {
  const name = config
    ? config.network === "aevum"
      ? "Aevum testnet"
      : config.network === "local"
        ? "Local Anvil"
        : "Demo mode"
    : "Loading network…";
  const chain =
    config?.network === "aevum"
      ? "44005"
      : config?.network === "local"
        ? "31337"
        : undefined;
  return (
    <div className="app-network" role="status">
      <p className="app-env-row">
        <span className={config ? "network-dot" : "network-dot pending"} />
        <span className="app-env-name">{name}</span>
        {chain && (
          <span className="app-env-meta" title={`Chain ID ${chain}`}>
            {chain}
          </span>
        )}
      </p>
      {frozen !== undefined && (
        <p
          className="app-env-row"
          aria-label={`Payments: ${frozen ? "Frozen" : "Live"}`}
        >
          <span className="app-env-label">Payments</span>
          <span className={"app-env-state " + (frozen ? "is-frozen" : "is-live")}>
            {frozen ? "Frozen" : "Live"}
          </span>
        </p>
      )}
    </div>
  );
}

export function AppShell({
  children,
  active,
  config,
  frozen,
}: {
  children: React.ReactNode;
  active: string;
  config?: Config;
  frozen?: boolean;
}) {
  return (
    <div className="product-app">
      <aside className="app-sidebar" aria-label="Application sidebar">
        <Link className="app-brand" href="/" aria-label="Cleared home">
          <BrandMark />
          <span>Cleared</span>
        </Link>
        <nav className="app-nav" aria-label="Application navigation">
          {navigation.map((item) => (
            <Link
              key={item.href}
              data-demo={{ "/try": "nav-try", "/attack": "nav-attack", "/app": "nav-treasury", "/app/keys": "nav-controls" }[item.href]}
              href={item.href}
              aria-current={active === item.href ? "page" : undefined}
              title={item.label}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d={item.path} />
              </svg>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <NetworkStatus config={config} frozen={frozen} />
      </aside>
      <div className="app-workspace">
        <div className="app-compact-status">
          <NetworkStatus config={config} frozen={frozen} />
        </div>
        {children}
        <footer className="app-disclaimer">
          Testnet prototype · Not audited
        </footer>
      </div>
    </div>
  );
}
