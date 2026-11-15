import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";

const env = parseEnv(readFileSync(".env.test", "utf8"));
const headers = {
  Origin: process.env.PLAYWRIGHT_BASE_URL ?? env.NEXT_PUBLIC_APP_URL!,
};

test("admin tabs identify their screen without exposing private page names", async ({
  page,
  request,
}) => {
  const signIn = await page.request.post("/api/auth/sign-in/email", {
    headers,
    data: {
      email: env.TEST_ADMIN_EMAIL,
      password: env.TEST_ADMIN_PASSWORD,
    },
  });
  expect(signIn.ok()).toBeTruthy();

  const title = "Private memory " + crypto.randomUUID().slice(0, 8);
  const created = await page.request.post("/api/pages", {
    headers,
    data: { title },
  });
  expect(created.status()).toBe(201);
  const { id } = await created.json();
  const editor = "/admin/pages/" + id;

  await page.goto(editor);
  await expect(page).toHaveTitle(title + " · Page editor · Our Memory Garden");
  await page.goto("/admin/pages");
  await expect(page).toHaveTitle("Pages · Our Memory Garden");

  await page.goto(editor + "/history");
  await expect(page).toHaveTitle(
    title + " · Version history · Our Memory Garden",
  );

  await page.goto("/admin/settings/homepage");
  await expect(page).toHaveTitle("Homepage settings · Our Memory Garden");

  const denied = await request.get(editor, { maxRedirects: 0 });
  expect(denied.headers().location).toBe("/login");
  expect(await denied.text()).not.toContain(title);
});
