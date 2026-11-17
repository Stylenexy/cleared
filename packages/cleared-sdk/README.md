# @cleared/sdk

Workspace source package for Cleared invoice payments on Aevum (44005) and local Anvil (31337). Not published to npm.

Exports chain configuration, ABIs, invoice types, exact six-decimal amounts, stage/approve/autoPay/freeze, preflight risk checks, reconciliation in inclusive ranges of at most 1,000 blocks, and formula-safe CSV.

`autoPay(agentWallet, vault, batchId)` calls agentExecute without an owner signature. The contract rechecks maturity, daily and grant caps, expiry, revocation, identity and freeze state. `approve(ownerWallet, vault, batchId)` can override a hold but no other rule.

All write helpers use legacy transactions. Callers must wait for receipts, check receipt.status, and obtain the batch ID from Staged. Preflight checks are advisory. See the root README and tools/local-check.ts.
