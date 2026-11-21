import "server-only";
import { randomInt } from "node:crypto";
import { after } from "next/server";
import { database } from "./db";
import { RequestError } from "./http";
import {
  usageAlerts,
  type UsageDay,
  type UsageOverview,
  type UsageSettings,
} from "../usage";

export const sampleEvery = () =>
  process.env.AUTH_MODE === "local" &&
  process.env.GARDEN_USAGE_SAMPLE_EVERY === "1" &&
  new URL(process.env.DATABASE_URL ?? "http://invalid").hostname === "127.0.0.1"
    ? 1
    : 20;
type Kind = "thumbnail" | "display" | "original" | "backup" | "other";
export function observeOriginResponse(response: Response, kind: Kind) {
  const weight = sampleEvery();
  if (randomInt(weight) !== 0) return response;
  const length = Number(response.headers.get("Content-Length") ?? 0);
  const bytes =
    response.ok &&
    response.status !== 304 &&
    Number.isSafeInteger(length) &&
    length > 0
      ? length
      : 0;
  const now = new Date();
  now.setUTCMinutes(0, 0, 0);
  after(async () => {
    try {
      await database()`insert into garden_usage_hourly(bucket,kind,samples,estimated_requests,estimated_bytes,estimated_errors,estimated_not_modified)
        values(${now.toISOString()},${kind},1,${weight},${bytes * weight},${response.status >= 500 ? weight : 0},${response.status === 304 ? weight : 0})
        on conflict(bucket,kind) do update set samples=garden_usage_hourly.samples+1,
          estimated_requests=garden_usage_hourly.estimated_requests+excluded.estimated_requests,
          estimated_bytes=garden_usage_hourly.estimated_bytes+excluded.estimated_bytes,
          estimated_errors=garden_usage_hourly.estimated_errors+excluded.estimated_errors,
          estimated_not_modified=garden_usage_hourly.estimated_not_modified+excluded.estimated_not_modified`;
      if (randomInt(1000) === 0)
        await database()`delete from garden_usage_hourly where bucket < now()-interval '90 days'`;
    } catch {
      console.warn("Garden usage sample could not be recorded.");
    }
  });
  return response;
}
const zero = (day: string): UsageDay => ({
  day,
  requests: 0,
  bytes: 0,
  errors: 0,
  samples: 0,
});
const sum = (rows: UsageDay[], day: string) =>
  rows.reduce(
    (total, row) => ({
      day,
      requests: total.requests + row.requests,
      bytes: total.bytes + row.bytes,
      errors: total.errors + row.errors,
      samples: total.samples + row.samples,
    }),
    zero(day),
  );
export async function usageOverview(): Promise<UsageOverview> {
  const sql = database();
  const [settingsRows, rows, recentRows, kinds] = await Promise.all([
    sql<
      UsageSettings[]
    >`with prune as (delete from garden_usage_hourly where bucket < now()-interval '90 days') select hourly_requests::float8 as "hourlyRequests",daily_bytes::float8 as "dailyBytes",monthly_bytes::float8 as "monthlyBytes",error_percent as "errorPercent",version,started_at as "startedAt" from garden_usage_settings where singleton`,
    sql<
      UsageDay[]
    >`select to_char(bucket at time zone 'UTC','YYYY-MM-DD') as day,sum(estimated_requests)::float8 as requests,sum(estimated_bytes)::float8 as bytes,sum(estimated_errors)::float8 as errors,sum(samples)::float8 as samples from garden_usage_hourly where bucket >= least(date_trunc('month',now() at time zone 'UTC') at time zone 'UTC',date_trunc('day',now() at time zone 'UTC') at time zone 'UTC'-interval '6 days') group by 1 order by 1`,
    sql<
      UsageDay[]
    >`select '' as day,coalesce(sum(estimated_requests),0)::float8 as requests,coalesce(sum(estimated_bytes),0)::float8 as bytes,coalesce(sum(estimated_errors),0)::float8 as errors,coalesce(sum(samples),0)::float8 as samples from garden_usage_hourly where bucket >= date_trunc('hour',now() at time zone 'UTC') at time zone 'UTC'`,
    sql<
      UsageOverview["kinds"]
    >`select kind,sum(estimated_requests)::float8 as requests,sum(estimated_bytes)::float8 as bytes,sum(samples)::float8 as samples from garden_usage_hourly where bucket >= date_trunc('month',now() at time zone 'UTC') at time zone 'UTC' group by kind order by bytes desc`,
  ]);
  const day = new Date().toISOString().slice(0, 10),
    monthKey = day.slice(0, 7);
  const settings = JSON.parse(JSON.stringify(settingsRows[0])) as UsageSettings;
  const today = rows.find((row) => row.day === day) ?? zero(day);
  const month = sum(
      rows.filter((row) => row.day.startsWith(monthKey)),
      monthKey,
    ),
    recent = recentRows[0];
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(day + "T00:00:00Z");
    date.setUTCDate(date.getUTCDate() - 6 + i);
    const key = date.toISOString().slice(0, 10);
    return rows.find((row) => row.day === key) ?? zero(key);
  });
  return {
    measuredAt: new Date().toISOString(),
    settings,
    today,
    month,
    recent,
    days,
    kinds,
    alerts: usageAlerts(today, month, recent, settings),
    sampleEvery: sampleEvery(),
  };
}
export async function saveUsageSettings(body: Record<string, unknown>) {
  const { dailyBytes, monthlyBytes, errorPercent, hourlyRequests, version } =
    body;
  if (
    !Number.isSafeInteger(dailyBytes) ||
    Number(dailyBytes) < 1e6 ||
    Number(dailyBytes) > 1e13 ||
    !Number.isSafeInteger(monthlyBytes) ||
    Number(monthlyBytes) < 1e6 ||
    Number(monthlyBytes) > 1e14 ||
    !Number.isSafeInteger(errorPercent) ||
    Number(errorPercent) < 1 ||
    Number(errorPercent) > 100 ||
    !Number.isSafeInteger(hourlyRequests) ||
    Number(hourlyRequests) < 100 ||
    Number(hourlyRequests) > 1e9 ||
    !Number.isSafeInteger(version)
  )
    throw new RequestError(400, "Choose valid warning levels.");
  const rows =
    await database()`update garden_usage_settings set daily_bytes=${Number(dailyBytes)},monthly_bytes=${Number(monthlyBytes)},error_percent=${Number(errorPercent)},hourly_requests=${Number(hourlyRequests)},version=version+1 where singleton and version=${Number(version)} returning version`;
  if (!rows.length)
    throw new RequestError(
      409,
      "Warning settings changed elsewhere. Refresh before editing them.",
    );
  return { saved: true };
}
