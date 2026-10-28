import { test, expect } from "@playwright/test";
test("administrators see sign in and password recovery, with no registration entry", async ({
  page,
}) => {
  await page.goto("/login");
  await expect(
    page.getByRole("heading", { name: "Welcome back" }),
  ).toBeVisible();
  await expect(page.getByLabel("Email address")).toBeVisible();
  await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("link", { name: /register|sign up/i }),
  ).toHaveCount(0);
  await page.getByRole("link", { name: "Forgot your password?" }).click();
  await expect(
    page.getByRole("heading", { name: "Reset your password" }),
  ).toBeVisible();
});
