import { Wallpaper } from "./wallpaper";
import { Arrow } from "../brand";

const skills = [
  {
    title: "Payee registry",
    href: "/try",
    sticker: "Name-exact",
    kind: "registry",
    list: ["One name", "One verified address", "Exact match"],
  },
  {
    title: "24-hour hold",
    href: "/try",
    sticker: "Day one",
    kind: "hold",
    list: ["New payee", "Changed address", "Time to review"],
  },
  {
    title: "Kill switch",
    href: "/app/keys",
    sticker: "One tap",
    kind: "switch",
    list: ["Owner control", "All agent payments", "Frozen at once"],
  },
  {
    title: "Live ledger",
    href: "/app#ledger",
    sticker: "On-chain",
    kind: "ledger",
    list: ["Paid or rejected", "Reason attached", "Public record"],
  },
] as const;

export function SafetyGrid() {
  return (
    <section
      className="safety-section desk-section"
      aria-labelledby="safety-title"
    >
      <div className="section-rule safety-photo-header photo-section">
        <Wallpaper scene="steel" />
        <h2 id="safety-title">How it stays safe</h2>
        <span>Contract-enforced</span>
      </div>
      <div className="safety-grid">
        {skills.map((skill, index) => (
          <a
            className="safety-card"
            href={skill.href}
            data-cursor="Open"
            key={skill.kind}
          >
            <h3>{skill.title}</h3>
            <span className="skill-index">
              0{index + 1} <Arrow />
            </span>
            <span className="skill-sticker">{skill.sticker} ↗</span>
            <div
              className={`skill-demo skill-${skill.kind}`}
              aria-hidden="true"
            >
              {skill.kind === "registry" && (
                <>
                  <span>NAME → DESTINATION</span>
                  <div>
                    Northwind <i>↗</i>
                  </div>
                  <div>
                    0x166F4C0F…1d5A <i>✓</i>
                  </div>
                  <span className="skill-result">EXACT MATCH</span>
                </>
              )}
              {skill.kind === "hold" && (
                <>
                  <div className="skill-clock">
                    <i />
                    <strong>24h</strong>
                  </div>
                  <span>NEW ADDRESS / ON HOLD</span>
                </>
              )}
              {skill.kind === "switch" && (
                <>
                  <div className="skill-switch">
                    <span>OFF</span>
                    <i />
                  </div>
                  <span className="switch-off-label">PAYMENTS ENABLED</span>
                  <span className="switch-on-label">
                    ALL AGENT PAYMENTS FROZEN
                  </span>
                </>
              )}
              {skill.kind === "ledger" && (
                <>
                  <span>ILLUSTRATED DECISIONS</span>
                  <div>
                    <span>↗ Paid</span>
                    <code>Verified</code>
                  </div>
                  <div>
                    <span>↳ Rejected</span>
                    <code>NameMismatch</code>
                  </div>
                  <div className="ledger-ghost">
                    <span>↗ Paid</span>
                    <code>Verified</code>
                  </div>
                </>
              )}
            </div>
            <ul className="skill-list">
              {skill.list.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </a>
        ))}
      </div>
    </section>
  );
}
