# Cleared design

A treasury workspace for web3 teams and DAOs paying contractor invoices in stablecoins. Invoices, full destination addresses and explicit contract decisions are the main objects.

Design tokens live in web/app/globals.css: deep green #173f32 for actions, paper #f5f1e6, ink #172b24, red #a32626 for rejection. Avenir Next/Trebuchet MS handles body text, Georgia headings and Consolas addresses.

The attack screen places extracted fields beside the payment decision. Every simulation is labeled. The local ledger is not a public network metric. New or changed payees show a live hold timer, and the kill switch remains prominent.

Layouts support 360 px with wrapping addresses, internal table scroll, visible keyboard focus and reduced motion. Contrast is checked by tools/check-contrast.mjs. No browser was launched for this task; interactive visual review remains manual.
