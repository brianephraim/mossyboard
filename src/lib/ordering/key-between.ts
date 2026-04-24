const POSITION_ALPHABET = "0123456789";
const POSITION_BASE = BigInt(POSITION_ALPHABET.length);
const POSITION_KEY_WIDTH = 16;
const MAX_POSITION_VALUE = POSITION_BASE ** BigInt(POSITION_KEY_WIDTH) - 1n;

export function keyBetween(prev: string | null, next: string | null): string {
  const lower = prev === null ? 0n : decodePositionKey(prev);
  const upper = next === null ? MAX_POSITION_VALUE : decodePositionKey(next);

  if (prev !== null && next !== null && lower >= upper) {
    throw new Error("Previous position must sort before next position");
  }

  const candidate = (lower + upper) / 2n;
  if (candidate <= lower || candidate >= upper) {
    throw new Error("No room between the provided position keys");
  }

  return encodePositionKey(candidate);
}

function decodePositionKey(input: string): bigint {
  if (input.length !== POSITION_KEY_WIDTH) {
    throw new Error(`Position keys must be ${POSITION_KEY_WIDTH} characters long`);
  }

  let value = 0n;
  for (const char of input) {
    const digit = POSITION_ALPHABET.indexOf(char);
    if (digit === -1) {
      throw new Error(`Invalid position key character: ${char}`);
    }
    value = value * POSITION_BASE + BigInt(digit);
  }

  return value;
}

function encodePositionKey(input: bigint): string {
  if (input <= 0n || input >= MAX_POSITION_VALUE) {
    throw new Error("Position key is out of range");
  }

  let remaining = input;
  const digits = Array.from({ length: POSITION_KEY_WIDTH }, () => POSITION_ALPHABET[0]);

  for (let index = POSITION_KEY_WIDTH - 1; index >= 0; index -= 1) {
    const digit = Number(remaining % POSITION_BASE);
    digits[index] = POSITION_ALPHABET[digit] ?? POSITION_ALPHABET[0];
    remaining /= POSITION_BASE;
  }

  return digits.join("");
}
