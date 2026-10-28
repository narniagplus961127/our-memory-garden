import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
const env = Object.fromEntries(
  (await readFile(".env.test", "utf8"))
    .trim()
    .split(/\r?\n/)
    .map((line) => {
      const i = line.indexOf("=");
      return [line.slice(0, i), line.slice(i + 1)];
    }),
);
test("password recovery uses a one-time link and returns a neutral confirmation", async ({
  page,
  baseURL,
}) => {
  await page.goto("/forgot-password");
  await page.getByLabel("Email address").fill(env.TEST_ADMIN_EMAIL);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByRole("status")).toContainText(
    "If this address belongs",
  );
  const mail = JSON.parse(
    await readFile(
      "work/local-mail/" + encodeURIComponent(env.TEST_ADMIN_EMAIL) + ".json",
      "utf8",
    ),
  );
  expect(new URL(mail.url).origin).toBe(baseURL);
  await page.goto(mail.url);
  await expect(
    page.getByRole("heading", { name: "A fresh start" }),
  ).toBeVisible();
  await page.getByLabel("New password").fill(env.TEST_ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Set password" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Your password has been updated",
  );
  const token = new URL(page.url()).searchParams.get("token");
  const used = await page.request.post(baseURL + "/api/auth/reset-password", {
    headers: { Origin: baseURL! },
    data: { token, newPassword: env.TEST_ADMIN_PASSWORD },
  });
  expect(used.status()).toBe(400);
  await page.getByRole("link", { name: "Back to sign in" }).click();
  await page.getByLabel("Email address").fill(env.TEST_ADMIN_EMAIL);
  await page
    .getByLabel("Password", { exact: true })
    .fill(env.TEST_ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/pages$/);
});
