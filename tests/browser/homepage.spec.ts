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

test("visibility and homepage controls keep visitors in step with saved content", async ({
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
  const title = "The gate at dusk " + Date.now();
  await page.getByLabel("Page title", { exact: true }).fill(title);
  await page.getByRole("button", { name: "Create private page" }).click();
  await expect(page).toHaveURL(/\/admin\/pages\/[0-9a-f-]+$/);
  const id = page.url().split("/").pop()!;
  await page.getByLabel("Page text").fill("A robin visited the garden gate.");
  await expect(page.getByRole("status")).toHaveText("Saved");
  await page.getByLabel("Page visibility").selectOption("public");
  await expect(page.getByRole("status")).toHaveText("Saved");
  const visitor = await browser.newContext();
  const publicPage = await visitor.newPage();
  await publicPage.goto(baseURL + "/p/" + id);
  await expect(
    publicPage.getByText("A robin visited the garden gate."),
  ).toBeVisible();
  await page.getByLabel("Page visibility").selectOption("private");
  await expect(page.getByRole("status")).toHaveText("Saved");
  expect((await publicPage.goto(baseURL + "/p/" + id))?.status()).toBe(404);
  await page.getByLabel("Page visibility").selectOption("public");
  await expect(page.getByRole("status")).toHaveText("Saved");
  await page.goto("/admin/settings/homepage");
  await page.getByLabel("Public page").selectOption({ label: title });
  await page.getByRole("button", { name: "Choose as homepage" }).click();
  await expect(page.getByRole("status")).toHaveText("Homepage updated");
  await publicPage.goto(baseURL + "/");
  await expect(publicPage.getByRole("heading", { name: title })).toBeVisible();
  await expect(
    publicPage.getByText("A robin visited the garden gate."),
  ).toBeVisible();
  await page.getByRole("link", { name: "Edit homepage", exact: true }).click();
  await expect(page.getByLabel("Page visibility")).toBeDisabled();
  await page.getByLabel("Page text").fill("The robin returned for breakfast.");
  await expect(page.getByRole("status")).toHaveText("Saved");
  await publicPage.reload();
  await expect(
    publicPage.getByText("The robin returned for breakfast."),
  ).toBeVisible();
  await visitor.close();
});
