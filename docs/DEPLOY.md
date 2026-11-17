# Deploy Cleared from the repository root

The repository is an npm workspace. Its application is `web/`; `@cleared/sdk` and `@cleared/guard` are sibling source packages. The root `vercel.json` keeps the Vercel project at the repository root and builds the application workspace.

## Vercel settings

| Setting                        | Value                                         |
| ------------------------------ | --------------------------------------------- |
| Root Directory                 | Repository root (`.`), not `web`              |
| Framework Preset               | Next.js                                       |
| Install Command                | `npm ci`                                      |
| Build Command                  | `npm run build`                               |
| Output Directory               | `web/.next`                                   |
| Node.js                        | 24.x (matches the local project requirements) |
| Environment variables for demo | None                                          |

Keep those values aligned with `vercel.json`; do not apply a conflicting dashboard override. Do not use static export or an SPA catch-all rewrite: `/api/config`, `/api/parse` and `/api/attack` are server routes.

From the repository root, the build runs the web workspace's `next build --webpack`. The Next config transpiles both `@cleared/sdk` and `@cleared/guard` and sets the output tracing root to the repository root, so workspace source imports are included. `unpdf` remains a server external dependency for PDF parsing.

After the Next build, `tools/prepare-root-public.mjs` copies `web/public/` to an ignored root `public/` directory. This is necessary because Vercel's root Next builder collects public assets relative to its root entrypoint even though the Next build output is in `web/.next`. The mirror contains fonts, brand assets and sample invoices; `web/public/` remains the only source of truth. It overwrites files and does not delete anything. Do not maintain the mirror manually. The Next server's local start command still serves `web/public/` directly.

For later authorized deployment, run `vercel deploy` **from the repository root**, with the project using the settings above. Do not run `npx vercel build` as a local check; it needs account/project state.

Configuration references: [Vercel project configuration](https://vercel.com/docs/project-configuration), [Next transpilePackages](https://nextjs.org/docs/app/api-reference/config/next-config-js/transpilePackages). Asset collection was checked against [Vercel's Next builder](https://github.com/vercel/vercel/blob/main/packages/next/src/utils.ts) (`getStaticFiles`). Runtime project/destination handling is in [server-build.ts](https://github.com/vercel/vercel/blob/main/packages/next/src/server-build.ts).

## Demo without environment variables

```sh
npm ci
npm run build
npm run start --workspace web
```

PowerShell can use `npm.cmd` where execution policy prevents the `npm.ps1` shim. Open `http://127.0.0.1:3000/try`. The default mode is `demo`, with no contract address, provider credential, wallet or chain process required.

- `/try` loads the three samples, checks the sample policy, supports holds/freeze/owner approval, then shows simulated reconciliation and CSV export.
- `/attack` uses exact authored cached samples or the existing deterministic parser when edited; extraction source and policy source stay visible. The route never sends a transaction.
- `/app` can parse samples and uploaded text PDFs, TXT and CSV. Without contract configuration, transaction actions remain disabled.
- `/app/keys` displays controls with wallet/contract-dependent actions disabled.
- Explorer links from a simulation are explicitly links to the testnet homepage; only an actual configured transaction gets a receipt link.

Live model extraction and real Aevum interactions are optional later work. Existing variable names are documented in `.env.example`. Configure public contract addresses only after an authorized deployment and keep provider credentials server-side. Local deployment files are consulted only in explicitly selected local mode.

Open Graph image URLs use Vercel's supplied public `VERCEL_URL` during hosted builds and localhost during local builds. The live simulation is https://cleared-ecru.vercel.app/try. Fonts and brand assets are committed, so production builds do not download them.

## Verification boundary

`npm run build` must create `web/.next/BUILD_ID`, route manifests, page output, API handlers and file traces, plus the root public mirror. Local production HTTP checks cover the five UI routes, no-env config, sample PDF extraction, an authored poisoned invoice, and the public brand/font/sample assets.

See [TESTING.md](TESTING.md) for commands and verification boundaries. The live simulation is hosted; Aevum deployment and transaction evidence are pending.

Pages render dynamically so each response gets a fresh CSP nonce, which Next applies to its hydration scripts. Do not switch to static export or publicly cache nonce-bearing HTML. Inline styles support React scene transforms; production script policy permits self and the per-request nonce, without unsafe-inline or unsafe-eval. Server-only LLM endpoints are absent from connect-src.
