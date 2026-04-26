export type TagSwatch = {
  backgroundColor: string;
  textColor: string;
};

export const TAG_PALETTE: ReadonlyArray<TagSwatch> = [
  { backgroundColor: "$boardTagSwatch1Bg", textColor: "$boardTagSwatch1Text" },
  { backgroundColor: "$boardTagSwatch2Bg", textColor: "$boardTagSwatch2Text" },
  { backgroundColor: "$boardTagSwatch3Bg", textColor: "$boardTagSwatch3Text" },
  { backgroundColor: "$boardTagSwatch4Bg", textColor: "$boardTagSwatch4Text" },
  { backgroundColor: "$boardTagSwatch5Bg", textColor: "$boardTagSwatch5Text" },
  { backgroundColor: "$boardTagSwatch6Bg", textColor: "$boardTagSwatch6Text" },
  { backgroundColor: "$boardTagSwatch7Bg", textColor: "$boardTagSwatch7Text" },
  { backgroundColor: "$boardTagSwatch8Bg", textColor: "$boardTagSwatch8Text" },
];

const FNV1A_OFFSET = 0x811c9dc5;
const FNV1A_PRIME = 0x01000193;

function fnv1a(input: string): number {
  let hash = FNV1A_OFFSET;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, FNV1A_PRIME) >>> 0;
  }
  return hash;
}

export function getTagSwatch(normalizedName: string): TagSwatch {
  const index = fnv1a(normalizedName) % TAG_PALETTE.length;
  return TAG_PALETTE[index]!;
}
