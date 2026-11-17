# Three-minute Cleared demo

Audience: DAOs and web3 teams paying contractors in stablecoins. Start a visible
180-second timer. Rehearse the route `/try` -> `/attack` -> `/app` -> `/app/keys`
-> `/try`. Load all pages before the presentation. Keep live extraction and
contract checks off, and do not connect a wallet or sign a transaction for this
script. The default presentation uses labeled samples and simulation.

## Script by elapsed second

| Seconds | Say                                                                                                                          | Show / do                                                                                                                                                                                                                                             |
| ------- | ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0-7     | "AI agents now read invoices and pay them. Attackers noticed."                                                               | Show the three contractor invoices on `/try`.                                                                                                                                                                                                         |
| 7-14    | "Spend caps limit how much. Not to whom."                                                                                    | Point to the two Northwind addresses with matching edges and different middles.                                                                                                                                                                       |
| 14-20   | "What if the AI could be fooled and the money still couldn't move?"                                                          | Point to the full poisoned destination, then click **Simulate automatic payment**.                                                                                                                                                                    |
| 20-30   | "Two mature recipients clear. The lookalike is refused. Changed recipients wait for the owner."                              | Show two **Simulated Paid** results and the red mismatch, then select **Payment address changed just now** to show **PayeeOnHold**. Use explorer receipts only if already recorded in [TESTNET-PROOF.md](TESTNET-PROOF.md); this sample run has none. |
| 30-40   | "This is a simulation. No tokens move. The changed address starts a 24-hour hold."                                           | Click **Reset demo**, select **Payment address changed just now**, and show the countdown.                                                                                                                                                            |
| 40-50   | "The agent can pay the mature contractor, but cannot clear the hold or the lookalike."                                       | Click **Simulate automatic payment**. Point to the three distinct outcomes.                                                                                                                                                                           |
| 50-60   | "Owner approval clears the hold. It still cannot approve a name mismatch."                                                   | Click **Simulate owner approval**. Ledgerline clears; Northwind's already-paid reference is refused, and the lookalike remains refused.                                                                                                               |
| 60-70   | "Now take the attacker's seat."                                                                                              | Open `/attack`. Select lookalike A and keep **Hidden instruction** enabled. Keep live extraction and Aevum checks off.                                                                                                                                |
| 70-80   | "The invoice hides a request to replace the destination and skip verification."                                              | Click **X-ray** and reveal the hidden instruction.                                                                                                                                                                                                    |
| 80-90   | "This saved extraction is an authored illustration, not a live model response."                                              | Run the extraction. Show the source label and extracted destination beside the registry comparison.                                                                                                                                                   |
| 90-100  | "Even when extraction follows the hostile instruction, every address character must match."                                  | Point to the changed middle and **Name mismatch** refusal. The local attempt counter is a simulation total, not a public security metric.                                                                                                             |
| 100-110 | "The treasury reviews invoices before staging an immutable batch."                                                           | Open `/app`, click **Use three samples**, and show the review decisions.                                                                                                                                                                              |
| 110-120 | "Mature verified contractors can be paid by the agent within its grant. Held items need the owner."                          | Point to the review, stage and payment sections. In demo preview, contract execution is disabled. Explain the flow without signing.                                                                                                                   |
| 120-130 | "The owner sets total and per-invoice limits, expiry and revocation."                                                        | Open `/app/keys` and point to **Agent grant**. Describe the controls without saving changes.                                                                                                                                                          |
| 130-140 | "A shared daily budget resets at midnight UTC. The kill switch blocks all agent payments, including owner-approved batches." | Point to **Shared daily budget** and **Kill switch**. No on-chain update is made.                                                                                                                                                                     |
| 140-150 | "Here is the same freeze rule in the sample desk."                                                                           | Return to `/try`, click **Reset demo**, freeze demo payments, then **Simulate owner approval**. Show all payments refused.                                                                                                                            |
| 150-160 | "Resetting the simulation gives us the original three-invoice batch again."                                                  | Click **Reset demo**, then **Simulate automatic payment**. Show the reconciliation summary: two simulated paid, one refused, 0.65 tUSD8 cleared.                                                                                                      |
| 160-170 | "Every decision has a reference, destination, amount and result for reconciliation."                                         | Show the table and click **Export demo CSV**. State that this is a demo ledger with no transaction hash. Real reconciliation uses decoded Paid/Rejected events and matches invoice fields.                                                            |
| 170-180 | "For DAO contractor payments: let the agent act within budget, and let the contract enforce the verified destination."       | End on the two allowed invoices and refused lookalike. Stop the timer at 180 seconds.                                                                                                                                                                 |

## Presenter evidence notes

Until deployment, use the labeled simulation and local tests. Do not present
sample output as explorer evidence or a live model failure. An explorer homepage
does not prove a payment. When testnet evidence exists, the opening can finish
with two Paid events and one Rejected event using recorded transaction links.

Screenshots are archived UI captures, including earlier contractor references
and badge layout. Demo video and testnet receipts are pending. The live
simulation supplies neither. A preloaded page is not an offline-capable app:
sample parsing still needs the local or hosted server.

## Five judge questions

| Question                                   | Short answer                                                                                                                                                                                                                                       |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Who needs this?                            | DAOs and web3 teams paying contractor invoices in stablecoins. Mature verified recipients can be paid automatically; new or changed recipients need owner approval.                                                                                |
| Why are spend caps not enough?             | Caps bound the amount, but a poisoned invoice can redirect an allowed amount. Cleared rechecks the exact name and full destination in the paying contract.                                                                                         |
| Did you fool a live model?                 | This demo replays authored extraction fields and labels them. Live Gemini/Anthropic extraction is opt-in and is not used in this script. A model can resist an attack; payment verification remains independent.                                   |
| What if the owner or invoice is malicious? | The owner can authorize a malicious payee. A forged invoice for a mature legitimate recipient can still pass within budget. The prototype is unaudited; invoice authenticity, service delivery and owner security require organizational controls. |
| What is actually on Aevum today?           | Deployment and receipts are pending in TESTNET-PROOF.md. The contracts target Aevum's Shanghai, legacy-transaction and six-decimal-token constraints. Local tests demonstrate the policy; the UI simulation is not chain evidence.                 |

## Rehearsal log

Use an actual timer for every run. Record whether the full presentation completed
without Wi-Fi; include the fallback used in the notes. Leave unperformed runs
blank.

| Date | Duration | Timer used | Without Wi-Fi | Notes / fallback level |
| ---- | -------- | ---------- | ------------- | ---------------------- |
|      |          |            |               |                        |
|      |          |            |               |                        |
|      |          |            |               |                        |
|      |          |            |               |                        |

## Fallback ladder

Start at level 1 while testnet proof is pending. Level 0 requires configured
contract addresses and verified receipts recorded before presenting. Choose the
next available level immediately; never wait on stage or imply missing evidence.

| Level | Evidence / route                                                                                                                                          | Switch rule                                                                                                                                                                                                                                          |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0     | Live Aevum testnet reads plus [recorded proof](TESTNET-PROOF.md)                                                                                          | If any RPC request fails or exceeds 10 seconds, switch to level 1. Use only recorded receipt links; this script sends no transactions.                                                                                                               |
| 1     | [Wallet-free /try simulation](https://cleared-ecru.vercel.app/try), then [/attack](https://cleared-ecru.vercel.app/attack), treasury and controls         | Say explicitly that no transactions are sent. If hosting fails, switch to a previously tested loopback server (`npm run dev`, demo mode) if ready. If no working server is ready, move immediately to level 2.                                       |
| 2     | Rehearsed demo video stored locally (recording pending)                                                                                                   | If no recording is available or playback fails, immediately use level 3. Do not spend stage time searching for a file.                                                                                                                               |
| 3     | Local [desktop screenshot](shots/live/home-1440.png), [/try screenshot](shots/live/try-1440-full.png) and [attack screenshot](shots/live/attack-1440.png) | Explain the invoice -> extraction -> registry -> decision -> reconciliation flow from the captures. Only open transaction links already recorded in TESTNET-PROOF; the [explorer homepage](https://explorer-test.qday.info) alone proves no payment. |

For a no-Wi-Fi rehearsal, verify the local server and assets before disconnecting,
or use locally stored video/screenshots. Keep the 180-second timer running through
the fallback and record the actual result above.
