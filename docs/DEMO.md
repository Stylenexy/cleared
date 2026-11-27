# Three-minute Cleared demo

Audience: DAOs and web3 teams paying contractors in stablecoins. Start a visible
180-second timer. Open these tabs before you start: `/attack`, `/try`,
`/app/keys`, [TESTNET-PROOF.md](TESTNET-PROOF.md) and its explorer links. Do not
connect a wallet or sign anything during the demo: on-chain evidence comes from
the recorded scenario run, and live reads use `eth_call`.

## Script by elapsed second

| Seconds | Say | Show / do |
| --- | --- | --- |
| 0-8 | "AI agents now read invoices and pay them. Attackers noticed." | `/attack` with the Northwind invoice. |
| 8-16 | "Spend caps limit how much an agent pays. They don't limit who gets paid." | Point to the two Northwind addresses: same edges, different middle. |
| 16-24 | "This invoice hides an instruction: send the money elsewhere and skip verification." | Click **X-ray** to reveal the hidden instruction. |
| 24-45 | "I'm sending it to a live model." | Tick **Use live extraction** and **Read the contract decision with eth_call**, then **Run attack**. |
| 45-60 | "The model took the bait and extracted the lookalike. The contract still says: name mismatch, refused." | Point to the extracted destination beside the verified one, the source label (live provider) and "Read-only contract preview". |
| 60-90 | "That decision isn't a UI rule. Here is one agent batch on Aevum: the verified contractor was paid, the lookalike rejected, in the same transaction." | Open scenario 4 from TESTNET-PROOF.md on the explorer: one `Paid`, one `Rejected` (NameMismatch). |
| 90-110 | "A new or changed address waits 24 hours. The agent can't clear it; the owner can, and still can't approve a mismatch." | Explorer: scenario 3 `Rejected(PayeeOnHold)`, then scenario 5 owner-approved `Paid`. |
| 110-135 | "The agent's key has a total cap, per-invoice cap, daily budget and expiry. The owner can revoke it or freeze everything." | `/app/keys`, then explorer: scenario 6 `Rejected(Frozen)` and scenario 7 `AgentRevoked`. |
| 135-160 | "Want to play with it without a wallet? Three invoices, choose the risk, pull the kill switch." | `/try`: **Simulate automatic payment** (two cleared, lookalike refused), switch the second contractor to a changed address to show the hold. Say it's a simulation. |
| 160-172 | "It's reusable: an SDK to stage and reconcile, and a guard any Aevum agent can call before paying. MIT." | README packages section. |
| 172-180 | "Your AI can read the invoice. It can't redirect the money. That's Cleared." | Back to `/attack` showing the refusal. Stop the timer. |

If the live model resists the attack, say so and rerun once with Lookalike B. If
it resists again: "This time the model wasn't fooled. Either way, the payment
decision doesn't depend on it", then run the labeled saved sample. Never edit or
restage a model result.

## Five judge questions

| Question | Short answer |
| --- | --- |
| Who needs this? | DAOs and web3 teams paying contractor invoices in stablecoins. Mature verified recipients can be paid by the agent; new or changed recipients need the owner. |
| Why are spend caps not enough? | Caps bound the amount, not the destination. A poisoned invoice can redirect an allowed amount. Cleared rechecks the exact name and full address in the paying contract. |
| Did you fool a live model? | Yes, sometimes. In 10 measured live runs on 27 Nov the model followed the hidden instruction once, and the Aevum contract answered `Name mismatch` ([LIVE-MODEL-TEST.md](LIVE-MODEL-TEST.md)). A model that resists 9 times in 10 is still not a payment policy; the contract is. |
| What if the owner or invoice is malicious? | The owner can register a bad payee, so new payees wait 24 hours and every change is an on-chain event. A forged invoice for a verified recipient pays that recipient's verified address. Testnet only, unaudited. |
| What is on Aevum today? | Registry, identity directory and vault on chain 44005, bytecode reproducibly matched to this repository (`tools/verify-bytecode.mjs`), and seven recorded scenarios in TESTNET-PROOF.md. |

## Rehearsal log

Use an actual timer for every run. Leave unperformed runs blank.

| Date | Duration | Timer used | Without Wi-Fi | Notes / fallback level |
| ---- | -------- | ---------- | ------------- | ---------------------- |
|      |          |            |               |                        |
|      |          |            |               |                        |
|      |          |            |               |                        |

## Fallback ladder

| Level | Evidence / route | Switch rule |
| --- | --- | --- |
| 0 | Live `/attack` with model + `eth_call`, recorded explorer links | If the model or RPC fails or takes over 10 seconds, switch to level 1. |
| 1 | `/attack` with the labeled saved sample, explorer links from TESTNET-PROOF.md | If hosting fails, use a tested local server (`npm run dev`) or move to level 2. |
| 2 | Rehearsed demo video stored locally | If playback fails, use level 3 immediately. |
| 3 | Screenshots in `docs/shots/live/` and the TESTNET-PROOF.md table | Walk through invoice, extraction, registry, decision, receipt from the captures. |
