export type CountUpFormat = "calendar" | "total-days";
export type CountUpLanguage = "zh" | "en";
export type CountUpDigitMotion = "roll" | "none";

const malaysiaOffset = 8 * 60 * 60 * 1000;
const dayMs = 24 * 60 * 60 * 1000;

export function validCountUpDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^[1-9]\d{3}-\d{2}-\d{2}$/.test(value))
    return false;
  const date = new Date(value + "T00:00:00Z");
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

export function validCountUpTime(value: unknown): value is string {
  return typeof value === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

// Do calendar arithmetic using Malaysia's UTC+08:00 wall clock, regardless of
// the viewer's device time zone. UTC accessors operate on those shifted values.
export function countUpParts(
  startDate: string,
  startTime: string,
  now: number,
) {
  const start = new Date(startDate + "T" + startTime + ":00Z");
  const end = new Date(Math.max(start.getTime(), now + malaysiaOffset));
  let months =
    (end.getUTCFullYear() - start.getUTCFullYear()) * 12 +
    end.getUTCMonth() -
    start.getUTCMonth();

  function anniversary(monthOffset: number) {
    const date = new Date(start.getTime());
    date.setUTCDate(1);
    date.setUTCMonth(start.getUTCMonth() + monthOffset);
    const lastDay = new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
    ).getUTCDate();
    return date.setUTCDate(Math.min(start.getUTCDate(), lastDay));
  }

  if (anniversary(months) > end.getTime()) months--;
  const seconds = Math.floor((end.getTime() - anniversary(months)) / 1000);
  return {
    years: Math.floor(months / 12),
    months: months % 12,
    days: Math.floor(seconds / 86400),
    totalDays: Math.floor((end.getTime() - start.getTime()) / dayMs),
    hours: Math.floor(seconds / 3600) % 24,
    minutes: Math.floor(seconds / 60) % 60,
    seconds: seconds % 60,
  };
}
