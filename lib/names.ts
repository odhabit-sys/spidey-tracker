export const NAME_MAX = 16;

/** Display names: letters, digits, space and a little punctuation, upper-cased. */
export function cleanName(raw: string): string {
  return raw
    .normalize("NFC")
    .replace(/[^\p{L}\p{N} .'-]/gu, "")
    .replace(/\s+/g, " ")
    .slice(0, NAME_MAX)
    .toUpperCase();
}

export function isValidName(name: string): boolean {
  const trimmed = name.trim();
  return trimmed.length >= 1 && trimmed.length <= NAME_MAX && cleanName(trimmed) === trimmed;
}
