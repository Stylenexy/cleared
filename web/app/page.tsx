import { ClerkIntro } from "./components/landing/clerk-intro";
import { DeskIntro } from "./components/landing/desk-intro";
import { TerminalStory } from "./components/landing/terminal-story";
import { ProcessStory } from "./components/landing/process-story";
import { SafetyGrid } from "./components/landing/safety-grid";
import { TryClerk } from "./components/landing/try-clerk";
import { RepeatStory } from "./components/landing/repeat-story";
import { LedgerPreview } from "./components/landing/ledger-preview";
import { FooterStory } from "./components/landing/footer-story";

export default function Home() {
  return (
    <main className="landing signal-landing">
      <ClerkIntro />
      <DeskIntro />
      <TerminalStory />
      <ProcessStory />
      <SafetyGrid />
      <TryClerk />
      <RepeatStory />
      <section
        className="signal-ledger desk-section"
        aria-labelledby="ledger-title"
      >
        <div className="section-rule">
          <h2 id="ledger-title">The record speaks.</h2>
          <span>Live from Aevum</span>
        </div>
        <div className="signal-ledger-grid">
          <LedgerPreview />
          <div className="ledger-vault">
            <div className="contact-shadow" aria-hidden="true" />
            <img
              className="studio-object"
              src="/objects/vault.webp"
              width={701}
              height={732}
              alt="A cyan-lit treasury vault."
              loading="lazy"
              decoding="async"
            />
            <p>
              Your treasury.
              <br />
              <em className="serif-accent">Your final word.</em>
            </p>
          </div>
        </div>
      </section>
      <FooterStory />
    </main>
  );
}
