import { addressDiff } from "./address-diff";

export function AddressComparison({
  registered,
  candidate,
  checked = 42,
}: {
  registered: string;
  candidate: string;
  checked?: number;
}) {
  return (
    <div className="story-comparison">
      {[
        ["Registered", registered, candidate],
        ["Submitted", candidate, registered],
      ].map(([label, address, against]) => (
        <div className="story-address-row" key={label}>
          <span>{label}</span>
          <span className="sr-only">{address || "No address entered"}</span>
          <code className="story-address" aria-hidden="true">
            {addressDiff(address, against).map(
              ({ character, different }, index) => (
                <span
                  key={index}
                  data-checked={index < checked}
                  data-different={different}
                >
                  {character}
                </span>
              ),
            )}
          </code>
        </div>
      ))}
    </div>
  );
}
