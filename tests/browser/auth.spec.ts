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

test("website menu returns to the current page with Back and Escape", async ({
  page,
  isMobile,
}, testInfo) => {
  test.skip(!isMobile, "The website menu is the mobile navigation surface.");
  await page.goto("/login");
  const opener = page.getByRole("button", { name: "Open website menu" });
  await opener.click();
  const menu = page.getByRole("dialog", { name: "Our garden" });
  await expect(menu).toBeVisible();
  await expect(
    menu.getByRole("link", { name: "Our garden", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("website-menu.png"),
    fullPage: true,
  });
  await menu.getByRole("button", { name: "Back", exact: true }).click();
  await expect(menu).not.toBeVisible();
  await expect(opener).toBeFocused();
  await expect(page).toHaveURL(/\/login$/);
  await opener.click();
  await page.keyboard.press("Escape");
  await expect(menu).not.toBeVisible();
  await expect(opener).toBeFocused();
});
