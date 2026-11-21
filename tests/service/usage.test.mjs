import test from "node:test";
import assert from "node:assert/strict";
import postgres from "postgres";
import { usageAlerts } from "../../src/lib/usage.ts";

test("usage warnings require enough samples and independent warning levels", () => {
  const settings = {
    dailyBytes: 100,
    monthlyBytes: 1000,
    errorPercent: 10,
    hourlyRequests: 1000,
  };
  const empty = { bytes: 0, samples: 0, requests: 0, errors: 0 };
  assert.equal(
    usageAlerts({ ...empty, bytes: 10000, samples: 1 }, empty, empty, settings)
      .length,
    0,
  );
  assert.equal(
    usageAlerts(
      { ...empty, bytes: 100, samples: 5 },
      { ...empty, bytes: 1000, samples: 5 },
      { ...empty, requests: 100, errors: 10, samples: 10 },
      settings,
    ).length,
    3,
  );
  assert.equal(
    usageAlerts(
      empty,
      empty,
      { ...empty, requests: 1000, samples: 10 },
      settings,
    ).length,
    1,
  );
});

test("usage access and warning settings are protected and concurrent edits are rejected", async (t) => {
  if (
    !process.env.DATABASE_URL ||
    new URL(process.env.DATABASE_URL).hostname !== "127.0.0.1"
  )
    return t.skip("Needs isolated local fixtures");
  const base = process.env.TEST_BASE_URL;
  const sql = postgres(process.env.DATABASE_URL, { max: 1 });
  const request = (method = "GET", data, cookie, origin = base) =>
    fetch(base + "/api/usage", {
      method,
      headers: {
        Origin: origin,
        "Content-Type": "application/json",
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: data ? JSON.stringify(data) : undefined,
    });
  assert.equal((await request()).status, 401);
  const auth = await fetch(base + "/api/auth/sign-in/email", {
    method: "POST",
    headers: { Origin: base, "Content-Type": "application/json" },
    body: JSON.stringify({
      email: process.env.TEST_ADMIN_EMAIL,
      password: process.env.TEST_ADMIN_PASSWORD,
    }),
  });
  assert.equal(auth.status, 200);
  const cookie = auth.headers
    .getSetCookie()
    .map((v) => v.split(";")[0])
    .join("; ");
  try {
    const response = await request("GET", undefined, cookie);
    assert.equal(response.status, 200);
    const overview = await response.json();
    assert.equal(overview.days.length, 7);
    assert.ok(overview.settings.startedAt);
    const settings = {
      dailyBytes: 1e6,
      monthlyBytes: 1e9,
      errorPercent: 20,
      hourlyRequests: 10000,
      version: overview.settings.version,
    };
    assert.equal(
      (await request("PUT", settings, cookie, "https://outside.test")).status,
      403,
    );
    assert.equal(
      (await request("PUT", { ...settings, dailyBytes: -1 }, cookie)).status,
      400,
    );
    assert.equal((await request("PUT", settings, cookie)).status, 200);
    assert.equal((await request("PUT", settings, cookie)).status, 409);
    const before =
      await sql`select coalesce(sum(samples),0)::int as count from garden_usage_hourly`;
    for (let i = 0; i < 100; i++)
      await fetch(base + "/api/media/not-a-photo/display");
    for (let retry = 0; retry < 10; retry++) {
      const [after] =
        await sql`select coalesce(sum(samples),0)::int as count from garden_usage_hourly`;
      if (after.count > before[0].count) return;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    assert.fail("Origin samples were not recorded");
  } finally {
    await sql.end();
  }
});
