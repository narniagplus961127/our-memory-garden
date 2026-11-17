export const pageDateNode = "gardenPageDate";
export const pageDateAttribute = "data-garden-page-date";

export const pageDateFormats = [
  { value: "long", label: "07 JULY 2024" },
  { value: "short", label: "7 Jul 2024" },
  { value: "chinese", label: "2024年7月7日" },
] as const;

export type PageDateFormat = (typeof pageDateFormats)[number]["value"];
export function isPageDateFormat(value: unknown): value is PageDateFormat {
  return pageDateFormats.some((format) => format.value === value);
}

const longMonth = new Intl.DateTimeFormat("en-GB", {
  month: "long",
  timeZone: "UTC",
});
const shortMonth = new Intl.DateTimeFormat("en-GB", {
  month: "short",
  timeZone: "UTC",
});

export function formatPageDate(
  value: string | null | undefined,
  format: PageDateFormat,
) {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match || !value) return "";
  const [, year, month, day] = match;
  const date = new Date(value);
  if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== value)
    return "";

  if (format === "chinese")
    return `${year}年${Number(month)}月${Number(day)}日`;
  if (format === "short")
    return `${Number(day)} ${shortMonth.format(date)} ${year}`;
  return `${day} ${longMonth.format(date).toUpperCase()} ${year}`;
}
