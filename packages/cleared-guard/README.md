# @cleared/guard

Reusable payee matching for builders. Workspace source package, not yet published to npm.

TypeScript:

`import { isClearedPayee, assertClearedPayee } from "@cleared/guard";`

`await assertClearedPayee(publicClient, registryAddress, "Contractor", payeeAddress);`

Solidity: import ClearedGuard and IClearedRegistry from @cleared/guard/ClearedGuard.sol, initialize the immutable registry, then apply `onlyClearedPayee(name, payee)` to the payment function. See contracts/src/Checkout.sol and contracts/test/IdentityGuard.t.sol.

The modifier checks the destination against the current registry. It does not authenticate the caller, authorize treasury withdrawals, enforce a trust delay or spend cap, or prove a real-world identity. Checkout is an explicit user-paid transferFrom example; autonomous treasury payments use ClearedVault. TypeScript preflight cannot replace the Solidity check because identity may change before settlement.

Solidity 0.8.28, Shanghai-compatible. MIT.
