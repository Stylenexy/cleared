# Public sample addresses

All destinations below are fictional samples. The source of truth is
[web/lib/sample-addresses.ts](../web/lib/sample-addresses.ts). They are derived from
public UTF-8 seeds using Keccak-256 and EIP-55, without generating or using keys.

| Sample                              | EIP-55 address                               | Seed (prefix `cleared/sample/v1/`) |
| ----------------------------------- | -------------------------------------------- | ---------------------------------- |
| Northwind Design Studio             | `0x166F4C0Ffa36b44204374aA51E2cae4C8e151d5A` | `KOPI_PAGI`                        |
| Ledgerline Audits                   | `0xf695d707A5b57FbC7972D0f6e84E1fd04C38E37b` | `KERTAS_KITA`                      |
| Northwind Design Studio lookalike A | `0x166F5022A68693C76082fEa29649e06d719b1d5A` | `KOPI_PAGI_LOOKALIKE_1/15`         |
| Northwind Design Studio lookalike B | `0x166F3e2D69846d20041caD0ddF8Fe9A284C31d5A` | `KOPI_PAGI_LOOKALIKE_2/13`         |
| Northwind Design Studio lookalike C | `0x166FD8EB81837FCfe0122EB33e9944C210fb1d5A` | `KOPI_PAGI_LOOKALIKE_3/7`          |
| Ledgerline Audits updated sample    | `0xEa09D102636305ec8B3F41729803CF2a29A09E1E` | `KERTAS_KITA_UPDATED`              |

The original seed identifiers (`KOPI_PAGI`, `KERTAS_KITA`) are retained so the public destinations remain reproducible. Display names are Northwind Design Studio and Ledgerline Audits. Current sample files are `01-northwind.{txt,pdf}`, `02-ledgerline.{txt,pdf}` and `03-poisoned.{txt,pdf}`, with invoice references `NDS-001`, `LLA-002` and `NDS-003`.

Base addresses use the last 20 bytes of `keccak256(seed)`. Lookalikes use the
base address's first and last four hex characters and the seed-derived address's
middle 32 hex characters, followed by EIP-55 checksumming. Nonces select identical
edge casing as well: every Northwind Design Studio sample begins `0x166F` and ends `1d5A`.
These are constructed poisoning examples, not claims of known attacker accounts.

Run `npm run samples` after changing the source module. It synchronizes TXT/CSV,
the generated Foundry constants, labeled simulation exports, PDFs and the root
public mirror. Seed reproduction, checksum validity, address edges, invoice
consistency and per-character scene highlighting are covered by tests.
