import { reviewAutonomy, type AgentPolicy, type Invoice } from "@cleared/sdk";
export const demoPolicy: AgentPolicy = {
  totalLimit: 1_000_000n,
  perItemLimit: 500_000n,
  spent: 0n,
  expiresAt: 4_000_000_000n,
  version: 1n,
  revoked: false,
};
export function demoVerified(i: Pick<Invoice, "name" | "payee">): boolean {
  return (
    (i.name === "Kopi Pagi" &&
      i.payee.toLowerCase() === "0x1111111111111111111111111111111111111111") ||
    (i.name === "Kertas Kita" &&
      i.payee.toLowerCase() === "0x2222222222222222222222222222222222222222")
  );
}
export function demoDecision(
  i: Invoice,
  options: {
    frozen?: boolean;
    holdSeconds?: bigint;
    dailyRemaining?: bigint;
  } = {},
): string {
  return reviewAutonomy(i, demoVerified(i), demoPolicy, 1000n, {
    frozen: options.frozen ?? false,
    holdSeconds: options.holdSeconds ?? 0n,
    dailyRemaining: options.dailyRemaining ?? 1_000_000n,
  });
}
export interface AttackLedger {
  attempted: number;
  refused: number;
  centsLost: number;
}
export function recordAttack(
  ledger: AttackLedger,
  rejected: boolean,
  amount: bigint,
): AttackLedger {
  if (
    !Number.isSafeInteger(ledger.attempted) ||
    ledger.attempted < 0 ||
    !Number.isSafeInteger(ledger.refused) ||
    ledger.refused < 0 ||
    ledger.refused > ledger.attempted ||
    !Number.isSafeInteger(ledger.centsLost) ||
    ledger.centsLost < 0
  )
    throw new Error("Invalid local ledger");
  return {
    attempted: ledger.attempted + 1,
    refused: ledger.refused + (rejected ? 1 : 0),
    centsLost: ledger.centsLost + (rejected ? 0 : Number(amount / 10_000n)),
  };
}
