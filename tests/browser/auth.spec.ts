import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
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

test("authentication forms stay inactive without JavaScript and have a private native submission", async ({
  browser,
  isMobile,
  baseURL,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: isMobile
      ? { width: 390, height: 844 }
      : { width: 1280, height: 800 },
  });
  const page = await context.newPage();
  try {
    for (const [path, field, endpoint] of [
      ["/login", "Password", "sign-in/email"],
      ["/forgot-password", "Email address", "request-password-reset"],
      ["/reset-password?token=dummy-check", "New password", "reset-password"],
    ]) {
      await page.goto(baseURL + path);
      await expect(page.getByLabel(field, { exact: true })).toBeDisabled();
      await expect(page.locator(".auth-main form")).toHaveAttribute(
        "method",
        "post",
      );
      await expect(page.locator(".auth-main form")).toHaveAttribute(
        "action",
        "/api/auth/" + endpoint,
      );
      await expect(
        page.getByText("Enable JavaScript to use this form.", { exact: true }),
      ).toBeVisible();
    }
  } finally {
    await context.close();
  }
});

test("authentication waits for client initialization before accepting credentials", async ({
  page,
}) => {
  let releaseScripts = () => {};
  const scriptsReady = new Promise<void>((resolve) => {
    releaseScripts = resolve;
  });
  await page.route("**/_next/static/chunks/**", async (route) => {
    await scriptsReady;
    await route.continue();
  });
  try {
    await page.goto("/login", { waitUntil: "commit" });
    await expect(page.getByLabel("Email address")).toBeDisabled();
    await expect(page.getByLabel("Password", { exact: true })).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Sign in", exact: true }),
    ).toBeDisabled();
  } finally {
    releaseScripts();
    await page.unrouteAll({ behavior: "wait" });
  }
  await expect(page.getByLabel("Email address")).toBeEnabled();
  await page.route("**/api/auth/sign-in/email", (route) =>
    route.fulfill({
      status: 401,
      json: { message: "This test sign-in was denied." },
    }),
  );
  await page
    .getByLabel("Email address")
    .fill("readiness-check@example.invalid");
  await page
    .getByLabel("Password", { exact: true })
    .fill("dummy-readiness-check-only");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.locator(".auth-main [role=alert]")).toHaveText(
    "This test sign-in was denied.",
  );
  await expect(page).toHaveURL(/\/login$/);
});

test("signed-in gardeners return from the public website to their dashboard", async ({
  page,
  isMobile,
}) => {
  const {
    NEXT_PUBLIC_APP_URL: origin,
    TEST_ADMIN_EMAIL: email,
    TEST_ADMIN_PASSWORD: password,
  } = parseEnv(readFileSync(".env.test", "utf8"));
  if (!origin || !email || !password)
    throw new Error("Configure the local auth fixture first.");
  const signedIn = await page.request.post("/api/auth/sign-in/email", {
    headers: { Origin: origin },
    data: { email, password },
  });
  expect(signedIn.status()).toBe(200);
  await page.goto("/admin");
  if (isMobile) await page.getByLabel("Open administration menu").click();
  await page.getByRole("link", { name: "View website ↗", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await page
    .getByRole("link", { name: "Garden dashboard", exact: true })
    .click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(
    page.getByRole("heading", { name: "Hello, gardeners", exact: true }),
  ).toBeVisible();
  await page.goto("/login");
  await expect(page).toHaveURL(/\/admin$/);
  await expect(
    page.getByRole("heading", { name: "Hello, gardeners", exact: true }),
  ).toBeVisible();
});

test("anonymous garden dashboard navigation still asks for sign in", async ({
  page,
}) => {
  await page.goto("/");
  const dashboard = page.getByRole("link", {
    name: "Garden dashboard",
    exact: true,
  });
  await expect(dashboard).toHaveAttribute("href", "/admin");
  await dashboard.click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByRole("heading", { name: "Welcome back", exact: true }),
  ).toBeVisible();
});
