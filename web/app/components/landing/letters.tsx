import { splitLetters } from "../../../lib/landing-animation";

export function Letters({ text }: { text: string }) {
  return (
    <>
      {splitLetters(text).map((letter, index) => (
        <span className="motion-letter" key={index}>
          {letter === " " ? "\u00a0" : letter}
        </span>
      ))}
    </>
  );
}
