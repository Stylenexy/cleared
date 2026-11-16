# @pagar/sdk

MIT TypeScript workspace package for a six-decimal tUSD8 Pagar vault. The package exports source TypeScript; use a TS-aware bundler or Node 24. Peer dependency: viem ^2.57.0.

Exports: `Invoice`, `BatchItem`, `AgentPolicy`, `Settlement`, `Rejection`, `Reconciliation`; `vaultAbi`, `registryAbi`, `tokenAbi`; `aevum`, `local`, `TUSD8`; `amount6`, `displayAmount`, `invoiceRef`, `reviewInvoice`; `stage`, `approve`, `getLogsChunked`, `reconcile`, `reconcileRows`, `toCsv`.

`stage(wallet, vault, items)` and `approve(wallet, vault, batchId)` submit legacy transactions and return hashes. Wallet chain must be 31337 or 44005. Stage accepts 1 to 50 items. Wait for receipts and obtain `Staged.batchId` before approval. Owner approval never uses an agent signing key.

`reconcile(publicClient, vault, invoices, fromBlock, toBlock?, batchId?)` scans at most 1,000 blocks per request and returns human-readable accounting rows. Pass the actual deployment block and a batch id to avoid scanning unrelated history. A matching ref with changed address, amount, or invoice hash becomes a discrepancy. One payment event is consumed once when input contains duplicate invoices. Rejected rows retain their rejection transaction hash. No reorg persistence is provided.

`amount6` rejects floats, negative/zero values, exponent notation, thousands separators, amounts above uint256, and fractions beyond six decimals. `toCsv` escapes quotes and neutralizes formula-like cell prefixes.

Runnable example: `../../tools/local-check.ts`. From repo root: `npm test`, `npm run typecheck`. Full setup and trust model: `../../README.md`. Network facts and log-chunk strategy derived from Aevum Starter Kit (MIT, PQA Labs); original license: `../../NOTICE`.
