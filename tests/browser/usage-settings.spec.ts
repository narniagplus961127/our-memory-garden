import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import postgres from "postgres";
const env = parseEnv(readFileSync(".env.test", "utf8"));
test("usage screen saves warning levels and shows actionable administrator warnings", async ({
  page,
}, testInfo) => {
  const connection = process.env.DATABASE_URL;
  test.skip(
    !connection || new URL(connection).hostname !== "127.0.0.1",
    "Uses isolated local aggregates only",
  );
  const sql = postgres(connection!, { max: 1 });
  const [row] =
    await sql`insert into garden_usage_hourly(bucket,kind,samples,estimated_requests,estimated_bytes) values(date_trunc('hour',now()),'other',100,2000,9000000000) on conflict(bucket,kind) do update set samples=100,estimated_requests=2000,estimated_bytes=9000000000 returning bucket`;
  try {
    const headers = {
      Origin: process.env.PLAYWRIGHT_BASE_URL ?? env.NEXT_PUBLIC_APP_URL!,
    };
    expect(
      (
        await page.request.post("/api/auth/sign-in/email", {
          headers,
          data: {
            email: env.TEST_ADMIN_EMAIL,
            password: env.TEST_ADMIN_PASSWORD,
          },
        })
      ).ok(),
    ).toBeTruthy();
    await page.goto("/admin/settings/usage");
    await expect(
      page.getByRole("heading", { name: "Usage & alerts", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(
        "Estimated photo and backup traffic passed your daily warning level.",
        { exact: true },
      ),
    ).toBeVisible();
    await page
      .getByRole("spinbutton", { name: "Daily transfer · MB" })
      .fill("501");
    await page
      .getByRole("spinbutton", { name: "Monthly transfer · GB" })
      .fill("21");
    await page
      .getByRole("spinbutton", { name: "Server errors · % per hour" })
      .fill("25");
    await page.getByRole("button", { name: "Save warning levels" }).click();
    await expect(
      page.getByText("Usage warning levels saved.", { exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("spinbutton", { name: "Daily transfer · MB" }),
    ).toHaveValue("501");
    await expect(
      page.getByRole("spinbutton", { name: "Monthly transfer · GB" }),
    ).toHaveValue("21");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
    ).toBe(false);
    await page.screenshot({
      path: testInfo.outputPath("usage-screen.png"),
      fullPage: true,
    });
    await page.goto("/admin");
    await expect(
      page.getByRole("link", { name: "A usage warning needs your attention" }),
    ).toBeVisible();
  } finally {
    await sql`delete from garden_usage_hourly where bucket=${row.bucket} and kind='other'`;
    await sql.end();
  }
});
