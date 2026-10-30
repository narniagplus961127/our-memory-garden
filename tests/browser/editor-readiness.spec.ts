import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
const env = Object.fromEntries(
  (await readFile(".env.test", "utf8"))
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const i = line.indexOf("=");
      return [line.slice(0, i), line.slice(i + 1)];
    }),
);
test("editor controls wait for client initialization before accepting edits", async ({
  page,
}) => {
  const origin = env.NEXT_PUBLIC_APP_URL;
  expect(
    (
      await page.request.post(origin + "/api/auth/sign-in/email", {
        headers: { Origin: origin },
        data: {
          email: env.TEST_ADMIN_EMAIL,
          password: env.TEST_ADMIN_PASSWORD,
        },
      })
    ).status(),
  ).toBe(200);
  const created = await (
    await page.request.post("/api/pages", {
      headers: { Origin: origin },
      data: { title: "An editor ready to grow" },
    })
  ).json();
  let release!: () => void, arrived!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve)),
    blocked = new Promise<void>((resolve) => (arrived = resolve));
  await page.route("**/*", async (route) => {
    if (
      route.request().resourceType() === "script" &&
      new URL(route.request().url()).pathname.startsWith("/_next/")
    ) {
      arrived();
      await gate;
    }
    await route.continue();
  });
  try {
    await page.goto("/admin/pages/" + created.id, { waitUntil: "commit" });
    await blocked;
    await expect(
      page.getByRole("button", { name: "Select Text 1", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Select Text 1", exact: true }),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Open settings panel" }),
    ).toBeDisabled();
    await expect(page.getByLabel("Page title", { exact: true })).toBeDisabled();
  } finally {
    release();
  }
  await expect(
    page.getByRole("button", { name: "Select Text 1", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Select Text 1", exact: true })
    .click();
  await page.getByRole("button", { name: "Open settings panel" }).click();
  await page
    .getByRole("textbox", { name: "Text content", exact: true })
    .fill("The first edit after loading survives.");
  await expect(
    page.getByRole("status", { name: "Auto-save status" }),
  ).toHaveText("Saved");
  await page.reload();
  await page
    .getByRole("button", { name: "Select Text 1", exact: true })
    .click();
  await page.getByRole("button", { name: "Open settings panel" }).click();
  await expect(
    page.getByRole("textbox", { name: "Text content", exact: true }),
  ).toHaveValue("The first edit after loading survives.");
});
