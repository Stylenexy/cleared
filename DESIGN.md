# Cleared — the clearing desk

Cleared gives an agent room to read and prepare invoices while Aevum's payee registry and guarded vault keep the final word on who receives the money: the agent can be fooled; the destination still has to clear.

## Direction and metaphor

An after-hours clearing desk: matte blue-black surroundings, crisp white invoice stock, deliberate movements, and a physical **CLEARED / REFUSED** impression. The logo is an open clearing slip that resolves into a check. Its open corner is the entry point for an invoice; the final rising stroke is the decision. It is original SVG geometry, also used for the favicon and social artwork.

The main object is an invoice, not a decorative security shield or abstract orb. The poisoned sample invoice is the hero object, with its extraction and registry check on the same desk. A compact reconciliation ledger appears after the boundary walkthrough. The scroll sequence carries the poisoned invoice through extraction, registry comparison, refusal and the receipt trail. The registry is visibly separate from extraction because contracts check payment fields, not prompts. White document surfaces distinguish untrusted input from the dark policy workspace; white is never a claim of trust.

All surfaces share one quiet background. There are no section dividers, eyebrow labels, status dots, invented transaction hashes, testimonials or network metrics. Paper uses a static feTurbulence grain at .04 opacity and a directional desk-lamp shadow. Stamps are SVG ink impressions. There are no stacked backdrop blurs or WebGL. Controls remain ordinary labeled controls.

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
| Glow                     | `#172a40`              | Quiet illumination behind the desk.                                   |
| Sheen                    | `#243346`              | Subtle receipt depth; replaces both former panel sheen literals.      |
| Sheet                    | `#bfd1e9`              | Offset paper under the invoice.                                       |
| Document well            | `#e5ecf6`              | Revealed instruction on white invoice stock.                          |
| Document refusal         | `#a12532`              | Dark red ink for the physical refusal stamp.                          |

These are design choices, not claims of a measured psychological effect. Orange/purple were considered but would add competing meanings to a payment decision; only amber is retained for holds.

**Archivo 800 at 112% width** gives headings the authority of an institutional wordmark without a squeezed display face. Two-line major headings end in a still, restrained white-to-steel finish. **Manrope** is a self-hosted geometric reading face with an open texture; **Avenir Next** is preferred for buttons where installed, with Manrope/Trebuchet as compatible fallbacks. **Consolas** appears only in addresses, hashes and code. The editable invoice remains in the reading face. Archivo and Manrope ship locally with OFL notices; the build does not fetch fonts.

Desktop section introductions place the heading and an explanatory paragraph on a common baseline; longer explanatory paragraphs are justified with hyphenation. Narrow screens use left alignment and manual hyphenation. Heading tracking is -0.03em on desktop and -0.025em at widths up to 700px; wordmark tracking is -0.04em. Text stays at least 12px. Radius steps are 14 / 12 / 10 / 6 px for panels / cards / controls / badges.

## Motion contract

1. **Reveal:** the invoice starts with ordinary fields. The hidden instruction opens through clip-path as the normalized playhead advances from .05 to .25. X-ray exposes it immediately in the lab. Source editing stays escaped, ordinary text.
2. **Extract:** a chip carries the authored extraction to its registry slot. InvoiceTheatre measures First and Last positions on resize, applies the inverse displacement and scale, then interpolates only the transform from playhead .28 to .50. No layout property is animated.
3. **Compare:** both full addresses use the same 21-column character grid, continuing on a second line. All differing characters receive an underline and the red token. These fictional poisoning samples preserve the first and last four hex characters, while the middle differs.
4. **Decide:** at .75 the SVG impression strikes from 1.04 to 1, the paper moves 2px, and the desk gradually blends toward red-soft. The final caption reads Refused: NameMismatch and explains that the address is not registered to Kopi Pagi. The lab uses the actual API rejection flag for its stamp and ledger.
5. **Receipt:** /try exposes a labeled demo reconciliation table and CSV. /app exposes confirmed contract events and the real explorer transaction link only when a transaction exists. No sample is presented as a transaction receipt.

ClearingScene owns one event-driven scroll rAF scheduler. A single normalized playhead p drives all four beats; there is no idle render loop. Sticky staging requires at least 1024px width and 880px height, so a 1280×800 laptop gets ordinary document flow. Step controls write the same playhead on smaller screens. Reduced motion resolves the visual to its final state without pinning or animation. The lab runs one bounded 1.8-second rAF sequence only after a successful response; a failed request cannot produce a decision stamp. A separate single-invoice boundary component walks spending limits, identity, the 24-hour hold and the kill switch.

**One new leap from RESEP §5: cross-document View Transitions.** The invoice article on the landing and the invoice article in the attack lab share `view-transition-name: clearing-document`; the brand remains a shared anchor. Native same-origin links opt into `@view-transition { navigation: auto }` with a 650 ms position transition. No experimental React/Next transition flag, router timing hack or screenshot imitation. Supporting browsers interpolate the document into the attack workspace. Unsupported browsers use normal navigation. Reduced motion disables the transition and all entrance animations and removes pinning. Reference: [MDN cross-document transitions](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@view-transition).

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

For V2 the task explicitly forbids all browser use, including headless browsers. No browser or wallet was opened. Type checking, static production rendering, unit/contract tests, contrast measurement and CSS review can verify source behavior, but cannot establish viewport geometry, keyboard traversal, scroll feel, LCP/CLS, CPU or fps.

Manually check the hero invoice's first-fold presence, long instruction wrapping, stamp spacing in both preview and source editor, address-chip alignment during FLIP, two-line character alignment at 360px, the boundary invoice's path, and landing-to-lab view transitions. At 360px, the source rules collapse all theatre grids to minmax(0,1fr), wrap hashes and preformatted invoice text, constrain controls and use 21 address columns; real viewport overflow remains unmeasured. The generated 1200×630 OG image was inspected as a local image and uses Archivo with the same message as the hero: “Let your agent pay. Keep the last word.”
