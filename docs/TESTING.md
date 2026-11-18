# Testing Cleared

From the repository root, with Node 24, npm, Foundry and Solidity 0.8.28 available:

```sh
npm ci
npm run setup
forge test
npm test
npm run typecheck
npm run build
npm run check:contrast
gitleaks git --redact
```

`npm run setup` obtains the verified compiler and Foundry tooling. On PowerShell, `npm.cmd` can be used if the npm script shim is restricted. None of the test commands needs a wallet, private environment file, faucet, live provider or testnet transaction.

Verified: 70 Foundry + 300 Vitest tests. The test runners print the authoritative totals when the suite changes.

## What the suites prove

- **Foundry:** exact recipient identity, all three sample lookalikes, the 24-hour trust delay, changed-address and re-registration holds, owner approval, staged-held batches, grant renewal/expiry/revocation, shared daily limits, freeze, duplicate references, atomic transfer failure, guard integration and identity revisions. Withdrawal tests check the `Withdrawn` owner/amount event, balances, owner authorization and transfer failure. The grant invariant also runs 256 fuzz cases.
- **Vitest:** strict invoice schemas and six-decimal amounts, TXT/CSV/PDF parsing, mocked Gemini/Anthropic adapters, provider failures, authored attack fixture labeling, API origin/schema/body/text/rate limits, SSRF input rejection, public configuration allowlisting, settlement matching and readable mismatch explanations, formula-safe CSV, chunked log ranges, nonce policies, checkbox markup/CSS and sample address reproduction.
- **Typecheck/build:** root SDK, guard, tests and application types; production Next server routes, dynamic nonce-bearing pages, bundled assets and the root public mirror.
- **Gitleaks:** committed Git history. `.gitleaksignore` suppresses one exact historical fingerprint for the public tUSD8 token address; it is not a broad rule exemption. Uncommitted changes require a separate working-tree review before release.
- **Contrast:** committed color pairs and UI contrast tokens. This does not replace a visual review.

Tests use synthetic credentials and mocked fetch for providers. No real LLM reliability, testnet availability, deployment success or independent audit is implied.

## Production HTTP verification without a browser

Start a production server after building, in demo mode with no configured provider:

```sh
npm run start --workspace web -- --port 3116
```

In another terminal, set `CLEARED_SMOKE_PORT=3116` in the process environment and run:

```sh
node tools/web-smoke.mjs
```

The script requests five pages, verifies security headers, checks every rendered script against its response CSP nonce, verifies different requests get different nonces, rejects cross-origin API requests, compares served assets with their sources and build mirror, uploads three PDFs and checks an authored cached attack refusal. It uses only loopback HTTP. It does not start a browser or send transactions.

The CSP allows same-origin resources and the fixed Aevum HTTPS RPC. Next hydration scripts receive a fresh nonce through `proxy.ts`; pages render dynamically and are not publicly cached. Inline styles support React scene transforms. Development adds eval for Next HMR and loopback connections; production scripts do not allow eval or unrestricted inline execution. LLM endpoints are called only by the server and are absent from the client policy.

The API rate limiter is process-local: 20 parse/attack requests and 60 config requests per minute per IP and route. It trusts the edge-overwritten `x-forwarded-for` only on Vercel. Other deployments share a single fallback bucket unless an operator integrates a trusted proxy. The map is capped at 4,096 active buckets and fails closed when full. Multi-instance deployments need a shared quota and authentication. Request streams are capped before multipart/JSON decoding; files are limited to 2 MB, PDFs to ten pages, batches to 50 invoices, and extracted text/CSV to 20,000 characters. PDF isolation and slow-client protection remain infrastructure concerns.

Check `/attack` manually at 1440 and 360 pixels before presenting. The checkbox is fixed at 18 pixels with zero border/padding, excluded from full-width text-input styling, and its caption has a wrapping span. Static markup/CSS and HTTP checks cannot prove browser layout or wallet interaction.

## Testnet proof preparation

`tools/testnet-proof.mjs` is an explicit broadcast tool for later use. It is never called by build, tests, samples or the local demo. It was run once on 18 Nov 2026 (run r202611181345); `docs/TESTNET-PROOF.md` holds those receipts.

Before invoking it, deploy the Cleared contracts on chain 44005, fund the owner with at least 1 tUSD8 and test gas, and fund a dedicated agent with test gas. Register **Northwind Design Studio** to the intended `PROOF_TRUSTED_PAYEE` and wait the full 24-hour trust delay. Leave the vault unfrozen with at least 0.30 tUSD8 daily budget remaining. Use a dedicated proof vault/agent: the script grants and finally revokes that agent.

Supply these variables directly in the process environment; the script does not load environment files:

| Variable | Purpose |
| --- | --- |
| `CLEARED_PROOF_BROADCAST` | Exact opt-in value `aevum-testnet` |
| `DEPLOYER_PRIVATE_KEY` | Owner signer; must own both vault and registry |
| `PROOF_AGENT_PRIVATE_KEY` | Separate dedicated proof agent signer |
| `CLEARED_VAULT`, `CLEARED_REGISTRY` | Existing deployed contracts |
| `PROOF_TRUSTED_PAYEE` | Mature Northwind destination (the run uses the public sample address; nobody holds its key, so payments to it are unrecoverable test tokens) |
| `PROOF_HELD_PAYEE` | Distinct recipient for the new-recipient scenario (the run uses the public sample changed-address destination) |
| `PROOF_LOOKALIKE_PAYEE` | Distinct unregistered lookalike of the trusted destination; it will be refused |
| `PROOF_RUN_ID` | Unique 1–48 character identifier, letters/digits/hyphens |

When ready to broadcast, invoke `node tools/testnet-proof.mjs` explicitly. It fixes the RPC and explorer to Aevum testnet, verifies chain/token/ownership/registry/maturity/balances before writing, and uses legacy transactions. It records:

1. Deposit 1 tUSD8 and check the vault balance delta.
2. Automatically pay 0.10 tUSD8 to the mature trusted contractor and decode `Paid`.
3. Register a fresh `Ledgerline Audits proof <run>` identity, stage it and decode `Rejected(PayeeOnHold)`.
4. Stage one batch with a second trusted invoice and the lookalike; one execution must emit exactly one `Paid` (verified address) and one `Rejected(NameMismatch)`.
5. Restage the unpaid held invoice and execute with owner approval; verify its `Paid` fields.
6. Stage a trusted invoice, turn the kill switch on, execute and decode `Rejected(Frozen)`; the vault is always resumed afterwards, even if a step fails.
7. Revoke the dedicated agent, decode `AgentRevoked`, and verify state plus `previewPayment` refusal.

The recorder writes transaction hashes and direct explorer links to `docs/TESTNET-PROOF.md` after each confirmed, verified receipt, including setup/staging rows. The report stays marked **INCOMPLETE** until all seven scenarios pass. Failures stop execution; already confirmed transactions remain real and are not rolled back. Do not blindly rerun after a partial failure or reuse a run ID: inspect receipts and use a fresh dedicated run. The current report comes from the 18 Nov 2026 run, with all seven scenarios verified.

Every broadcast hash is printed and appended to the ignored `.local/proof-sent.log` before the script waits for its receipt, so an RPC failure never loses a sent transaction. Reads retry transient RPC errors three times; writes are never resent automatically. Preflight requires enough test gas for 8 owner and 9 agent transactions at the current gas price.

**Rehearsal on a local fork.** `CLEARED_PROOF_RPC` accepts only a loopback URL. Start `anvil --fork-url https://rpc-test.qday.info --port 8547`, advance time past the trust delay (`cast rpc evm_increaseTime 90000` then `cast rpc evm_mine`), and run the recorder with `CLEARED_PROOF_RPC=http://127.0.0.1:8547`. Nothing reaches the public chain; restore `docs/TESTNET-PROOF.md` afterwards because the fork's hashes are not evidence. A full fork rehearsal of all seven scenarios passed on 17 Nov 2026.
