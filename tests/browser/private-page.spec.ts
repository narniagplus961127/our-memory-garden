import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
const env = Object.fromEntries(
  (await readFile(".env.test", "utf8"))
    .trim()
    .split(/\r?\n/)
    .map((line) => {
      const index = line.indexOf("=");
      return [line.slice(0, index), line.slice(index + 1)];
    }),
);
test("either administrator creates and edits a private page while visitors receive not found", async ({
  page,
  browser,
  baseURL,
}) => {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(env.TEST_ADMIN_EMAIL);
  await page
    .getByLabel("Password", { exact: true })
    .fill(env.TEST_ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/pages$/);
  await page.getByRole("button", { name: "Create page", exact: true }).click();
  await page
    .getByLabel("Page title", { exact: true })
    .fill("Our quiet afternoon");
  await page.getByRole("button", { name: "Create private page" }).click();
  await expect(page).toHaveURL(/\/admin\/pages\/[0-9a-f-]+$/);
  const id = page.url().split("/").pop()!;
  await page.getByLabel("Page text").fill("We planted basil together.");
  await expect(page.getByRole("status")).toContainText("Saved");
  await page.reload();
  await expect(page.getByLabel("Page text")).toHaveValue(
    "We planted basil together.",
  );
  const visitor = await browser.newContext();
  const notFound = await visitor.request.get(baseURL + "/api/pages/" + id);
  expect(notFound.status()).toBe(404);
  const visitorPage = await visitor.newPage();
  const response = await visitorPage.goto(baseURL + "/p/" + id);
  expect(response?.status()).toBe(404);
  await expect(
    visitorPage.getByRole("heading", { name: "Page not found" }),
  ).toBeVisible();
  await visitor.close();
  const other = await browser.newContext();
  const otherPage = await other.newPage();
  await otherPage.goto(baseURL + "/login");
  await otherPage.getByLabel("Email address").fill(env.TEST_OTHER_EMAIL);
  await otherPage
    .getByLabel("Password", { exact: true })
    .fill(env.TEST_OTHER_PASSWORD);
  await otherPage.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(otherPage).toHaveURL(/\/admin\/pages$/);
  await otherPage.goto(baseURL + "/p/" + id);
  await expect(otherPage.getByText("We planted basil together.")).toBeVisible();
  await other.close();
});
