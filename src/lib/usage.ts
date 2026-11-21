export type UsageSettings = {
  hourlyRequests: number;
  dailyBytes: number;
  monthlyBytes: number;
  errorPercent: number;
  version: number;
  startedAt: string;
};
export type UsageDay = {
  day: string;
  requests: number;
  bytes: number;
  errors: number;
  samples: number;
};
export type UsageOverview = {
  measuredAt: string;
  settings: UsageSettings;
  today: UsageDay;
  month: UsageDay;
  recent: UsageDay;
  days: UsageDay[];
  kinds: { kind: string; requests: number; bytes: number; samples: number }[];
  alerts: string[];
  sampleEvery: number;
};
export const usageBytes = (value: number) => {
  const [divisor, unit] =
    value >= 1e9
      ? [1e9, "GB"]
      : value >= 1e6
        ? [1e6, "MB"]
        : value >= 1e3
          ? [1e3, "KB"]
          : [1, "B"];
  return (
    new Intl.NumberFormat("en", { maximumFractionDigits: 2 }).format(
      value / Number(divisor),
    ) +
    " " +
    unit
  );
};
export function usageAlerts(
  today: UsageDay,
  month: UsageDay,
  recent: UsageDay,
  settings: UsageSettings,
) {
  const alerts: string[] = [];
  if (today.samples >= 5 && today.bytes >= settings.dailyBytes)
    alerts.push(
      "Estimated photo and backup traffic passed your daily warning level.",
    );
  if (month.samples >= 5 && month.bytes >= settings.monthlyBytes)
    alerts.push(
      "Estimated photo and backup traffic passed your monthly warning level.",
    );
  if (
    recent.samples >= 10 &&
    recent.requests &&
    (recent.errors / recent.requests) * 100 >= settings.errorPercent
  )
    alerts.push(
      "Photo or backup server errors are elevated in the current hour.",
    );
  if (recent.samples >= 10 && recent.requests >= settings.hourlyRequests)
    alerts.push(
      "Estimated photo and backup requests passed your hourly warning level.",
    );
  return alerts;
}
