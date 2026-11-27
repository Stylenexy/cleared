# Cleared: architecture details

The [README](../README.md) gives the overview and the proof. This page keeps the contract rules, the reusable guard and SDK, and the AI extraction bounds.

## Risk-based autonomy

- PayeeRegistry has a fixed **trustDelay of 24 hours**. First verification, payment-address changes, and removal followed by re-registration restart the hold. Document or metadata updates at the same address preserve maturity.
- The treasury owner verifies exact UTF-8 names, accounts and optional document hashes. A payee resolves through the registry's IdentityRegistry; agents cannot modify either registry.
- `stageBatch` stores at most 50 immutable items and records whether each was held when staged. `agentExecute` is callable only by that batch's agent. It pays eligible items without an owner signature.
- A held-at-stage item still requires owner approval after time passes. A fresh review and batch may use the now-mature identity. The current registry and hold are always rechecked during execution.
- `approveAndExecute` permits the owner to clear a hold. It cannot bypass identity mismatch, grant caps, daily cap, expiry, revoke, duplicate references, insufficient balance or a freeze.
- The daily cap is shared by all agents and owner-approved agent batches. It resets at **00:00 UTC**, using `block.timestamp / 1 days`. Grant renewal does not reset daily spend. Lowering the cap below spend leaves zero remaining for that day.
- The kill switch freezes **all agent-originated payments**, including pending batches approved by the owner. Owner withdrawals remain available. Only the owner may freeze or resume.
- Agent grants have total and per-invoice limits, expiry, revocation and a version. A new grant resets its grant spend and invalidates its pending batches; daily accounting persists.
- Policy failures emit Rejected per item. Valid items emit Paid. Transfer failure reverts the entire execution atomically. State changes precede transfers, with a reentrancy lock.
- Invoice references are unique across the vault. SDK references hash `JSON.stringify([name, reference])`. Reconciliation also checks payee, amount and document hash and does not count one event twice.

## Identity and reusable guard

IdentityRegistry provides incrementing agent/payee IDs resolving to an account, metadata URI and account revision. PayeeRegistry owns its identity directory and exposes owner-controlled `registerWithMetadata` and `registerAgent`. Removed payees retain their identity audit trail but fail verification.

This is an **ERC-8004-style minimal directory**, not a complete implementation of [ERC-8004](https://eips.ethereum.org/EIPS/eip-8004). It does not provide the standard's transferable ERC-721 identities, wallet ownership proofs, reputation or validation registries. No claim of full compliance or "first on Aevum" is made.

The workspace packages are MIT source packages and have **not been published to npm**:

| Package | Builder interface |
| --- | --- |
| @cleared/sdk | Chain definitions, ABIs, exact amounts, stage, autoPay, approve, freeze, risk review, reconcile and CSV |
| @cleared/guard | isClearedPayee / assertClearedPayee helpers and abstract Solidity ClearedGuard with onlyClearedPayee |

```ts
import { stage, autoPay, approve, reconcile, toCsv } from "@cleared/sdk";
import { assertClearedPayee } from "@cleared/guard";

await assertClearedPayee(publicClient, registry, invoice.name, invoice.payee);
const stageHash = await stage(agentWallet, vault, items);
// Wait for a successful receipt and read Staged.batchId.
const executionHash = await autoPay(agentWallet, vault, batchId);
// Held invoices instead use approve(ownerWallet, vault, batchId).
const receipt = await publicClient.waitForTransactionReceipt({
  hash: executionHash,
});
if (receipt.status !== "success") throw new Error("Execution reverted");
const rows = await reconcile(
  publicClient,
  vault,
  invoices,
  deployBlock,
  receipt.blockNumber,
  batchId,
);
const csv = toCsv(rows);
```

Write helpers use legacy transactions. Preflight helpers are advisory; the paying contract must check identity again. See `contracts/src/Checkout.sol` for a user-paid `transferFrom` example guarded with `onlyClearedPayee`. The modifier enforces destination matching only; caller permissions, trust delays and treasury budgets belong in the integrating application. ClearedVault enforces those additional controls.

## Real AI extraction

`extractInvoice()` is the shared extraction boundary for /attack and the invoice parser. Supported HTTP providers are Gemini via Google AI Studio's [REST generateContent API](https://ai.google.dev/api/generate-content) and Anthropic's [Messages API](https://platform.claude.com/docs/en/api/messages/create). Only server process variables are used. No credentials are required for the demo.

| Variable | Meaning |
| --- | --- |
| LLM_PROVIDER | `gemini` or `anthropic` selects the provider |
| LLM_API_KEY | Server-only credential; never returned by /api/config |
| LLM_MODEL | Provider model ID; blank uses gemini-2.5-flash-lite or claude-haiku-4-5-20251001 |
| CLEARED_NETWORK | `demo` by default, or `local` / `aevum` |
| CLEARED_VAULT, CLEARED_REGISTRY, CLEARED_AGENT | Public testnet addresses; vault alone also selects Aevum mode, but all are needed for reads |
| CLEARED_DEPLOY_BLOCK | Start block for efficient reconciliation |
| DEPLOYER_PRIVATE_KEY | Owner credential for explicitly invoked deployment/proof scripts; unused by the web |

`.env.example` contains placeholders only. Configure environment through your own server process. Nothing reads a private key for the demo. Never give server credentials a `NEXT_PUBLIC` prefix.

- **Providers.** For Gemini, select `LLM_PROVIDER=gemini` and supply a Google AI Studio key in the server process as `LLM_API_KEY`; the default model is gemini-2.5-flash-lite. For Anthropic, select `anthropic`; the default is claude-haiku-4-5-20251001. Gemini uses `x-goog-api-key` in a request header, never a URL query. The server requests JSON Schema output and independently validates the returned invoice. Blocked, non-STOP, tool-call, ambiguous and malformed responses fail closed.
- **Opt-in.** Live extraction requires explicit UI opt-in; invoice text is then sent to the provider. The prompt treats document instructions as untrusted, and the payment contract is still the authority.
- **Bounds.** Input is limited to **20,000 characters**, output to 600 tokens, response size is checked, and a 20-second timeout applies. JSON must contain exactly reference, name, payee, amount and currency. Amount is a positive decimal string with at most six fractional digits in uint256 range; currency must be tUSD8. Names are bounded to 160 UTF-8 bytes. Unknown fields, malformed addresses, Markdown and truncated responses are rejected.
- **Saved samples.** Without a key, exact attack fixtures replay **saved fields**. One of them (Lookalike A with the hidden instruction) is a live model response captured on 27 Nov 2026 and labeled as such; the others are authored fixtures, labeled authored. Editing input prevents an unrelated cached result from being replayed; labeled TXT templates use deterministic extraction instead.
- **Honest failure.** Freeform extraction requires the live provider. Provider failures are surfaced; they do not silently become a fake live success. A model may resist an attack. The UI only calls it fooled when the extracted sample vendor has a changed destination, and identifies whether the output was live or staged.
- **Tests.** Unit tests use synthetic credentials and mocked fetch only. No real LLM, paid API or Aevum RPC is called in tests. No live-provider reliability claim is made; the one live measurement is in [docs/LIVE-MODEL-TEST.md](LIVE-MODEL-TEST.md).

The treasury accepts TXT, CSV and text PDFs: at most 10 files, 2 MB each, 10 pages per PDF, 50 invoices per batch. Scanned PDFs/OCR are unsupported. Hashes cover original TXT/PDF bytes; CSV hashes cover serialized row fields. Exact business references prevent repeated payment even across file formats. CSV exports neutralize spreadsheet formulas.
