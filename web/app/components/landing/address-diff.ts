export function addressDiff(address: string, against: string) {
  return Array.from(address, (character, index) => ({
    character,
    different: character.toLowerCase() !== against[index]?.toLowerCase(),
  }));
}

export function compareAddress(address: string, registered: string) {
  const valid = /^0x[0-9a-f]{40}$/i.test(address);
  const differences = Array.from(
    { length: Math.max(address.length, registered.length) },
    (_, index) =>
      address[index]?.toLowerCase() !== registered[index]?.toLowerCase(),
  ).filter(Boolean).length;
  return { valid, differences, matches: valid && differences === 0 };
}

function randomHex() {
  return globalThis.crypto.getRandomValues(new Uint8Array(1))[0] % 16;
}

export function poisonAddress(
  registered: string,
  previous = "",
  random: () => number = randomHex,
) {
  const digits = "0123456789abcdef";
  const characters = Array.from(registered);
  for (let index = 6; index < registered.length - 4; index++) {
    characters[index] = digits[random() % 16];
  }
  const change = (index: number) => {
    characters[index] =
      digits[(digits.indexOf(characters[index].toLowerCase()) + 1) % 16];
  };
  while (
    characters.join("").toLowerCase() === registered.toLowerCase() ||
    characters.join("").toLowerCase() === previous.toLowerCase()
  )
    change(6);
  return characters.join("");
}
