// Fictional sample destinations, derived from public UTF-8 seeds, never keys.
// Base addresses: EIP-55(last 20 bytes of keccak256(seed)).
// Lookalikes: replace the base's middle 32 hex digits with the seed-derived
// address's middle 32 digits, then apply EIP-55. Nonces match edge casing too.
export const SAMPLE_ADDRESS_SEEDS = {
  KOPI_PAGI: "cleared/sample/v1/KOPI_PAGI",
  KERTAS_KITA: "cleared/sample/v1/KERTAS_KITA",
  KOPI_PAGI_LOOKALIKES: [
    "cleared/sample/v1/KOPI_PAGI_LOOKALIKE_1/15",
    "cleared/sample/v1/KOPI_PAGI_LOOKALIKE_2/13",
    "cleared/sample/v1/KOPI_PAGI_LOOKALIKE_3/7",
  ],
  KERTAS_KITA_UPDATED: "cleared/sample/v1/KERTAS_KITA_UPDATED",
} as const;

export const KOPI_PAGI = "0x166F4C0Ffa36b44204374aA51E2cae4C8e151d5A" as const;
export const KERTAS_KITA =
  "0xf695d707A5b57FbC7972D0f6e84E1fd04C38E37b" as const;
export const KOPI_PAGI_LOOKALIKES = [
  "0x166F5022A68693C76082fEa29649e06d719b1d5A",
  "0x166F3e2D69846d20041caD0ddF8Fe9A284C31d5A",
  "0x166FD8EB81837FCfe0122EB33e9944C210fb1d5A",
] as const;
// A newly approved destination in the Ledgerline Audits address-change simulation.
export const KERTAS_KITA_UPDATED =
  "0xEa09D102636305ec8B3F41729803CF2a29A09E1E" as const;
