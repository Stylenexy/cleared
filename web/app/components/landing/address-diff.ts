export function addressDiff(address: string, against: string) {
  return Array.from(address, (character, index) => ({
    character,
    different: character !== against[index],
  }));
}
