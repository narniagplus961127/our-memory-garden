export const dividerIcons = ["logo", "star", "heart", "custom"] as const;
export type DividerIcon = (typeof dividerIcons)[number];

const graphemes = new Intl.Segmenter(undefined, { granularity: "grapheme" });

export function dividerEmoji(value: string) {
  const first = graphemes.segment(value.trim())[Symbol.iterator]().next()
    .value?.segment;
  return first &&
    first.length <= 64 &&
    /[\p{Other_Symbol}\p{Emoji_Presentation}\u20E3]/u.test(first)
    ? first
    : "";
}
