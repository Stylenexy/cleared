import { Arrow } from "../brand";

const skills = [
  {
    title: "Payee registry",
    href: "/try",
    kind: "registry",
    list: ["One name", "One verified address", "Exact match"],
  },
  {
    title: "24-hour hold",
    href: "/try",
    kind: "hold",
    list: ["New payee", "Changed address", "Time to review"],
  },
  {
    title: "Kill switch",
    href: "/app/keys",
    kind: "switch",
    list: ["Owner control", "All agent payments", "Frozen at once"],
  },
  {
    title: "Live ledger",
    href: "/app#ledger",
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
        <h2 id="safety-title">How it stays safe</h2>
        <p>Four rules the contract enforces, whatever the AI reads.</p>
      </div>
      <div className="safety-grid">
        {skills.map((skill) => (
          <a
            className="safety-card"
            href={skill.href}
            data-cursor="Open"
            key={skill.kind}
          >
            <h3>{skill.title}</h3>
            <span className="skill-index">
              <Arrow />
            </span>
            <div
              className={`skill-demo skill-${skill.kind}`}
              aria-hidden="true"
            >
              {skill.kind === "registry" && (
                <>
                  <span>Name → destination</span>
                  <div>
                    Northwind <i>↗</i>
                  </div>
                  <div>
                    0x166F4C0F…1d5A <i>✓</i>
                  </div>
                  <span className="skill-result">Exact match</span>
                </>
              )}
              {skill.kind === "hold" && (
                <>
                  <div className="skill-clock">
                    <i />
                    <strong>24h</strong>
                  </div>
                  <span>New address on hold</span>
                </>
              )}
              {skill.kind === "switch" && (
                <>
                  <div className="skill-switch">
                    <span>OFF</span>
                    <i />
                  </div>
                  <span className="switch-off-label">Payments enabled</span>
                  <span className="switch-on-label">
                    All agent payments frozen
                  </span>
                </>
              )}
              {skill.kind === "ledger" && (
                <>
                  <span>Illustrated decisions</span>
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
