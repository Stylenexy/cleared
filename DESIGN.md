# Cleared — the clearing desk

Cleared gives an agent room to read and prepare invoices while Aevum's payee registry and guarded vault keep the final word on who receives the money: the agent can be fooled; the destination still has to clear.

## Direction and metaphor

An after-hours clearing desk: matte blue-black surroundings, crisp white invoice stock, deliberate movements, and a physical **CLEARED / REFUSED** impression. The logo is an open clearing slip that resolves into a check. Its open corner is the entry point for an invoice; the final rising stroke is the decision. It is original SVG geometry, also used for the favicon and social artwork.

The main object is an invoice, not a decorative security shield or abstract orb. The hero previews the actual three-sample scenario. The scroll sequence carries the poisoned invoice through extraction, registry comparison, refusal and the receipt trail. The registry is visibly separate from extraction because contracts check payment fields, not prompts. White document surfaces distinguish untrusted input from the dark policy workspace; white is never a claim of trust.

All surfaces share one quiet background. There are no section dividers, eyebrow labels, status dots, invented transaction hashes, testimonials or network metrics. The light-catching panel edge is a static gradient and inset highlight; no stacked backdrop blurs or WebGL. Controls remain ordinary labeled controls.

## Palette and type

The authoritative color, type, radius and easing tokens are in `web/app/globals.css`. Brand generation and contrast checks read those tokens.

| Token                    | Hex                    | Purpose and rationale                                                 |
| ------------------------ | ---------------------- | --------------------------------------------------------------------- |
| Background               | `#0c1016`              | Matte, blue-black desk; keeps the invoice the brightest object.       |
| Surface / raised         | `#141c27` / `#1c2735`  | Small depth changes keep policy controls readable without glass blur. |
| Ink / secondary text     | `#f3f7fc` / `#b0bdce`  | Clear hierarchy with strong measured contrast.                        |
| Brand blue               | `#00bfff`              | Deep Sky Blue gives the clearing mark a recognizable, precise accent. |
| Action blue              | `#0870c8`              | Darker blue lets button text meet AA: 4.69:1.                         |
| Cleared                  | `#91d8ff` on `#172f42` | A calm, positive policy decision; same blue family as the mark.       |
| Refused                  | `#ffaaa5` on `#3a2028` | Reserved for refused destinations and failed operations.              |
| Hold                     | `#f5c58a` on `#362c22` | Waiting is distinct from identity rejection.                          |
| Document                 | `#f6f9fe`              | Clean white, deliberately without cream.                              |
| Document ink / secondary | `#182638` / `#4d5e73`  | Readable invoice fields, including the white attack editor.           |
| Document refusal         | `#a12532`              | Dark red ink for the physical refusal stamp.                          |

These are design choices, not claims of a measured psychological effect. Orange/purple were considered but would add competing meanings to a payment decision; only amber is retained for holds.

**Archivo 800 at 112% width** gives headings the authority of an institutional wordmark without a squeezed display face. Two-line major headings end in a still, restrained white-to-steel finish. **Manrope** is a self-hosted geometric reading face with an open texture; **Avenir Next** is preferred for buttons where installed, with Manrope/Trebuchet as compatible fallbacks. **Consolas** appears only in addresses, hashes and code. The editable invoice remains in the reading face. Archivo and Manrope ship locally with OFL notices; the build does not fetch fonts.

Desktop section introductions place the heading and an explanatory paragraph on a common baseline; longer explanatory paragraphs are justified with hyphenation. Narrow screens use left alignment. Radius steps are 14 / 12 / 10 / 6 px for panels / cards / controls / badges.

## Motion contract

1. **Arrival:** the hero is visible on the first frame and settles vertically over 1.1 s. No preloader or hidden LCP text.
2. **Extraction:** the sample invoice stays in the same place while the explanation changes from input to extracted fields. Full addresses remain available in the policy panel.
3. **Comparison:** the extracted and registered destinations become active in order. The changed final digit is underlined as well as colored.
4. **Decision:** the REFUSED stamp settles once into the document. Real demo actions produce CLEARED/REFUSED stamps from their actual decision strings; no simulated network confirmation animation.
5. **Receipt:** `/try` exposes a labeled demo reconciliation table and CSV. `/app` exposes confirmed contract events and the real explorer transaction link only when a transaction exists. The demo explorer link explicitly opens the testnet homepage, not a fake receipt.

`clearing-scene.tsx` owns the sole scroll rAF scheduler. A single normalized playhead `p` drives document position and the four semantic stages. Scroll/resize events schedule at most one frame; there is no running idle loop. The sequence is sticky only at >=1024 px width and >=760 px height. Step buttons work on mobile, short windows and reduced motion; they write the same playhead. Invoice rows enter at 60 ms intervals, and controls use a 180 ms state transition and 0.97 press scale. The hold clock runs only while a hold is active.

**One new leap from RESEP §5: cross-document View Transitions.** The clearing slip on the landing and the editable attack document share `view-transition-name: clearing-document`; the brand remains a shared anchor. Native same-origin links opt into `@view-transition { navigation: auto }` with a 650 ms position transition. No experimental React/Next transition flag, router timing hack or screenshot imitation. Supporting browsers interpolate the document into the attack workspace. Unsupported browsers use normal navigation. Reduced motion disables the transition and all entrance animations and removes pinning. Reference: [MDN cross-document transitions](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@view-transition).

## Opened reference sites — 17 November 2026

Research used readable web responses, not a recorded browser motion study. The observations below concern exposed content and interaction structure; proposed motion translations are our design decisions. No frame timing or visual performance of these sites was measured.

| Opened URL                                                                        | Useful observation                                                                | Translation to Cleared                                                                                  |
| --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| [Mercury](https://mercury.com/)                                                   | A direct demo entry alongside business banking/payment tasks.                     | Get to the sample desk without registration or a wallet.                                                |
| [Ramp](https://ramp.com/)                                                         | Bill payments and agent work are shown as financial operations.                   | Put invoices and payment boundaries before technical architecture.                                      |
| [Linear](https://linear.app/)                                                     | An embedded product workflow exposes concrete work items and activity.            | The hero is a legible clearing ledger rather than an abstract security illustration.                    |
| [Stripe Sessions](https://stripesessions.com/) (opened via `stripe.com/sessions`) | A very short headline leads into a clearly structured event narrative.            | Major two-line statements, then a compact explanation, then an interactive object.                      |
| [Lusion](https://lusion.co/)                                                      | Explicit scroll-to-explore storytelling and interactive work.                     | One invoice stays the protagonist through a controlled scroll sequence, without importing its 3D stack. |
| [Vercel Ship](https://vercel.com/ship)                                            | Direct, outcome-oriented event and demo navigation.                               | Clear route labels and one primary call to action at a time.                                            |
| [Resend](https://resend.com/)                                                     | Integration and test mode expose tangible request/result workflows.               | Keep simulated results separate from confirmed receipts; show the input and its decision.               |
| [Raycast](https://www.raycast.com/)                                               | Keyboard and tool interactions communicate utility through a recognizable object. | Make the document and step controls the interaction, with useful keyboard focus.                        |
| [Igloo](https://www.igloo.inc/) (opened via `igloo.inc`)                          | No readable response body was available.                                          | No detailed visual or motion claims taken from this response.                                           |

## Three directions not selected

- **White settlement room:** white/blue throughout with ledger typography. Excellent scanning, but loses the visual separation between an untrusted invoice and the authority that checks it.
- **Ultraviolet security observatory:** black/purple with a glowing vault object. Dramatic, but an abstract vault would compete with the name/address mismatch that makes the product different.
- **Orange dispatch desk:** industrial orange, routing rails, kinetic receipt printer. Memorable physicality, but too close to an operations console; orange would blur the distinction between holds and primary actions.

## Weight and accessibility budget

- No motion/UI dependency added. Motion source target <8 KB gzip; CSS target <10 KB gzip. These are source/asset budgets, not claims about total framework JS.
- Two local WOFF2 files total 61,952 bytes. Font budget <80 KB. OG image budget <320 KB; the social image is not loaded as a hero asset.
- No video, canvas or WebGL in the browser. Canvas runs only in the asset-generation script.
- One event-driven scroll scheduler; transform/opacity motion, no ambient animation or large backdrop filters. CPU/fps targets: idle <5%, desktop 60 fps, midrange mobile >=30 fps; still require a browser measurement.
- Text AA is checked against the actual CSS tokens, including action/hover, hold/refusal and document text. Tested pairs range from 4.69:1 to 17.72:1. The darkest chrome stop is also checked.
- 360 px design: navigation wraps, invoice columns collapse, selects have min-width:0/max-width:100%, full hashes wrap, tables scroll inside a labeled keyboard-focusable region. Horizontal page overflow must still be checked in a real viewport.
- Native controls, clear labels, visible focus, skip link, aria-current navigation/progress, pressed states, status announcements and non-color refusal wording.

## Weak parts / visual inspection still needed

The browser access host was unavailable. Selecting the already-open Brave window was refused with `Computer Use was not approved to use Brave`. No browser/profile was launched and no permission barrier was bypassed. As a result, 360/1440 screenshots, console errors, keyboard traversal, actual transition continuity, LCP/CLS, CPU and fps are **not verified**. Source review and HTTP smoke do not replace them.

Check the following by eye: the initial ledger's depth at 1440, white document/stamp spacing at 360, heading line breaks on Windows and mobile, long select options on narrow screens, scroll stage fit in an approximately 800 px-tall desktop viewport, and the landing-to-attack shared-document transition in a supporting browser. The sequence is intentionally static on short desktop windows and mobile, with explicit step buttons; it is less cinematic there. The artwork is product-native vector/layout material rather than a filmed or photoreal asset. The demo has no testnet transaction evidence and does not pretend otherwise.
