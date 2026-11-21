import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";

const env = parseEnv(readFileSync(".env.test", "utf8"));
test("page batches retain search and sort and public listings hide private pages", async ({
  page,
  browser,
}) => {
  test.setTimeout(180000);
  const headers = {
    Origin: process.env.PLAYWRIGHT_BASE_URL ?? env.NEXT_PUBLIC_APP_URL!,
  };
  await page.request.post("/api/auth/sign-in/email", {
    headers,
    data: { email: env.TEST_ADMIN_EMAIL, password: env.TEST_ADMIN_PASSWORD },
  });
  const prefix = "Batched " + crypto.randomUUID().slice(0, 8);
  const records = [];
  for (let index = 0; index < 26; index++) {
    const response = await page.request.post("/api/pages", {
      headers,
      data: { title: prefix + " " + String(index).padStart(2, "0") },
    });
    expect(response.status()).toBe(201);
    records.push(await response.json());
  }
  await page.goto(
    "/admin/pages?q=" + encodeURIComponent(prefix) + "&sort=title-asc",
  );
  await expect(page.locator(".admin-page-cards li")).toHaveCount(24);
  await page.getByRole("link", { name: "Next", exact: true }).click();
  await expect(page.locator(".admin-page-cards li strong")).toHaveText([
    records[24].title,
    records[25].title,
  ]);
  await expect(page.getByRole("combobox", { name: "Sort by" })).toHaveValue(
    "title-asc",
  );
  await expect(
    page.getByRole("searchbox", { name: "Search pages" }),
  ).toHaveValue(prefix);
  await expect(
    page.getByRole("link", { name: "Next", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("link", { name: "Previous", exact: true }).click();
  await expect(page.locator(".admin-page-cards li")).toHaveCount(24);
  for (const record of records.slice(0, 25)) {
    expect(
      (
        await page.request.patch("/api/pages/" + record.id, {
          headers,
          data: { version: record.version, visibility: "public" },
        })
      ).ok(),
    ).toBeTruthy();
  }
  const visitor = await browser.newContext();
  const garden = await visitor.newPage();
  await garden.goto("/garden");
  await expect(garden.locator(".garden-page-card")).toHaveCount(24);
  await expect(
    garden.getByRole("link", { name: records[25].title, exact: true }),
  ).toHaveCount(0);
  await garden.getByRole("link", { name: "Next", exact: true }).click();
  expect(await garden.locator(".garden-page-card").count()).toBeLessThanOrEqual(
    24,
  );
  await expect(
    garden.getByRole("link", { name: records[25].title, exact: true }),
  ).toHaveCount(0);
  await visitor.close();
});
