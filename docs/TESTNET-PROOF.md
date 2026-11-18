# Aevum testnet proof

Run: r202611181345. Chain: 44005. All seven scenarios verified.

Vault: [0x8FBA7Dd67E294B3ba5cA164748b9f41C03bad13C](https://explorer-test.qday.info/address/0x8FBA7Dd67E294B3ba5cA164748b9f41C03bad13C). Registry: [0xaD297045531dA0E71b9Ecd3DE215D2b63CB74e1D](https://explorer-test.qday.info/address/0xaD297045531dA0E71b9Ecd3DE215D2b63CB74e1D).

| Scenario | Verified observation | Transaction / explorer |
| --- | --- | --- |
| Setup: allowance | 1 tUSD8 allowance confirmed | [0x36466659d0ec3fd41a01ac6892cd558d581d31b14a29f9b5fdd07c853d5667d7](https://explorer-test.qday.info/tx/0x36466659d0ec3fd41a01ac6892cd558d581d31b14a29f9b5fdd07c853d5667d7) |
| 1. Deposit | Vault balance increased by 1 tUSD8 | [0x1fdaddf4a2f8462ded8a28e013f2b164976952d16b0263a9341034c159227bdf](https://explorer-test.qday.info/tx/0x1fdaddf4a2f8462ded8a28e013f2b164976952d16b0263a9341034c159227bdf) |
| Setup: dedicated grant | Dedicated proof agent granted 1 tUSD8 total / 0.20 per invoice | [0xa6f2a2673842ca6a1d48668416efce0dd08cf9adc31727be0d53fc8a5f89250d](https://explorer-test.qday.info/tx/0xa6f2a2673842ca6a1d48668416efce0dd08cf9adc31727be0d53fc8a5f89250d) |
| Stage: trusted | Immutable batch 1 | [0xb36f765eece3317be7bf51d9b262174cd6ed685c71471deff7029b4dd2d7015c](https://explorer-test.qday.info/tx/0xb36f765eece3317be7bf51d9b262174cd6ed685c71471deff7029b4dd2d7015c) |
| 2. Auto-pay trusted contractor | Paid 0.10 tUSD8 to the expected recipient | [0x6d796e1eb4c3ca385c88ba3a4a01b8a8edb44d51e16b092abea6ef54e17bc622](https://explorer-test.qday.info/tx/0x6d796e1eb4c3ca385c88ba3a4a01b8a8edb44d51e16b092abea6ef54e17bc622) |
| Setup: new recipient | New recipient has a nonzero trust hold | [0x13ba9488da45192154ccd66925f63bc0c111ebdfe94234cae161d8f98bdefa3d](https://explorer-test.qday.info/tx/0x13ba9488da45192154ccd66925f63bc0c111ebdfe94234cae161d8f98bdefa3d) |
| Stage: held | Immutable batch 2 | [0xc60ebc46e8bf686eb77df5d9d769b7056e89036f5b651712865c7185f27f6d6f](https://explorer-test.qday.info/tx/0xc60ebc46e8bf686eb77df5d9d769b7056e89036f5b651712865c7185f27f6d6f) |
| 3. Hold new recipient | Rejected: PayeeOnHold (9) | [0xcd92f4c1078e4b4c03c74d7782d2e69c1934c9216fcd9c728d2937a6e9345729](https://explorer-test.qday.info/tx/0xcd92f4c1078e4b4c03c74d7782d2e69c1934c9216fcd9c728d2937a6e9345729) |
| Stage: verified + lookalike | Immutable batch 3 | [0xee265e58c1b7803bdde348e94af33f9c4ee67400a7c2c7c4ca57c99e290cc5df](https://explorer-test.qday.info/tx/0xee265e58c1b7803bdde348e94af33f9c4ee67400a7c2c7c4ca57c99e290cc5df) |
| 4. Same batch: verified paid, lookalike refused | Paid 0.10 tUSD8 to the verified address; lookalike Rejected: NameMismatch (1) | [0xddffc6c3955e69fc5b991103c0d69a9a51cd22f23c84251f87155e78ac8464e4](https://explorer-test.qday.info/tx/0xddffc6c3955e69fc5b991103c0d69a9a51cd22f23c84251f87155e78ac8464e4) |
| Stage: owner approval | Immutable batch 4 | [0xb9757cec4f3a3630c13d42c79ae9250eab67a90a9df3026f6a678c96ecf9ebce](https://explorer-test.qday.info/tx/0xb9757cec4f3a3630c13d42c79ae9250eab67a90a9df3026f6a678c96ecf9ebce) |
| 5. Owner approves held recipient | Paid 0.10 tUSD8 to the expected recipient | [0x586eeeeb389fee332e2c21eacda77dc2625a229ce07ac014acef389b4b65c4ac](https://explorer-test.qday.info/tx/0x586eeeeb389fee332e2c21eacda77dc2625a229ce07ac014acef389b4b65c4ac) |
| Stage: kill switch | Immutable batch 5 | [0x8132be2578630486029fba68fb9a92310ee59703910593ef39c1c24999e177d8](https://explorer-test.qday.info/tx/0x8132be2578630486029fba68fb9a92310ee59703910593ef39c1c24999e177d8) |
| Setup: kill switch on | Vault frozen | [0x98bbcdcd5fdd019e0a828a0d416414d81952ee99930a22c0b3afeb82fdca9a35](https://explorer-test.qday.info/tx/0x98bbcdcd5fdd019e0a828a0d416414d81952ee99930a22c0b3afeb82fdca9a35) |
| 6. Kill switch blocks payment | Rejected: Frozen (10), kill switch on | [0x49df7a28ac6fd764a7bb5ff420efd61670657e3b03cd055424480c01a702d34e](https://explorer-test.qday.info/tx/0x49df7a28ac6fd764a7bb5ff420efd61670657e3b03cd055424480c01a702d34e) |
| Setup: kill switch off | Vault resumed | [0x719980dd827c61698ca1f0e649950d174928a7b071cf44beab918e3886e6f3a4](https://explorer-test.qday.info/tx/0x719980dd827c61698ca1f0e649950d174928a7b071cf44beab918e3886e6f3a4) |
| 7. Revoke agent key | AgentRevoked confirmed; preview refuses payment with Revoked (5) | [0xfff1e2d9746c09aee56380a9b56d2a5b617080284d0b123936b78eac10acdf57](https://explorer-test.qday.info/tx/0xfff1e2d9746c09aee56380a9b56d2a5b617080284d0b123936b78eac10acdf57) |

Only confirmed successful receipts with decoded expected events or checked state are recorded. Setup and staging rows are supporting evidence. All writes use legacy type 0.
