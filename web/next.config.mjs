import path from "node:path";
import { fileURLToPath } from "node:url";
import { securityHeaders } from "./lib/security-headers.mjs";
export default {
  transpilePackages: ["@cleared/sdk", "@cleared/guard"],
  outputFileTracingRoot: path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
  ),
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          ...securityHeaders,
          // Pages receive a per-request nonce policy from proxy.ts. This strict
          // fallback also protects API, static and error responses.
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; connect-src 'self' https://rpc-test.qday.info; img-src 'self' data:; font-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'",
          },
        ],
      },
    ];
  },
  agentRules: false,
  serverExternalPackages: ["unpdf"],
  experimental: { cpus: 2 },
};
