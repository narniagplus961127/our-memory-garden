import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { legacyTextContent } from "./editor-controls";

const env = parseEnv(readFileSync(".env.test", "utf8"));

test("insert a live page date in text and render the current date", async ({
  page,
  browser,
  baseURL,
}) => {
  const headers = { Origin: baseURL! };
  const signedIn = await page.request.post("/api/auth/sign-in/email", {
    headers,
    data: { email: env.TEST_ADMIN_EMAIL, password: env.TEST_ADMIN_PASSWORD },
  });
  expect(signedIn.ok()).toBeTruthy();
  const created = await page.request.post("/api/pages", {
    headers,
    data: { title: "Inline date " + crypto.randomUUID() },
  });
  expect(created.status()).toBe(201);
  const garden = await created.json();
  const api = "/api/pages/" + garden.id;
  const content = legacyTextContent();
  content.content[0].props.text = "Event ";
  const seeded = await page.request.patch(api, {
    headers,
    data: { content, version: garden.version, visibility: "public" },
  });
  expect(seeded.ok()).toBeTruthy();

  await page.goto("/admin/pages/" + garden.id);
  const field = page
    .frameLocator("iframe")
    .locator('.garden-text [contenteditable="true"]');
  await field.click();
  await field.press("End");
  await page.getByRole("button", { name: "Insert page date" }).click();
  const dialog = page.getByRole("dialog", { name: "Insert page date" });
  await expect(dialog.getByLabel("Date format")).toHaveValue("long");
  await dialog.getByRole("button", { name: "Insert date" }).click();
  const marker = field.locator('[data-garden-page-date="long"]');
  function dateOnCanvas() {
    return marker.evaluate(
      (el) =>
        el.ownerDocument.defaultView!.getComputedStyle(el, "::before").content,
    );
  }
  await expect(marker).toBeVisible();
  await expect.poll(dateOnCanvas).toBe('"Page date"');
  const saved = page.getByRole("status", { name: "Auto-save status" });
  await expect(saved).toHaveText("Saved");
  const exported = await page.request.get(api + "/json");
  expect(exported.ok()).toBeTruthy();
  expect(JSON.stringify(await exported.json())).toContain(
    'data-garden-page-date=\\"long\\"',
  );

  const visitor = await browser.newContext();
  try {
    const view = await visitor.newPage();
    const url = baseURL + "/garden/" + garden.slug;
    await view.goto(url);
    const date = view.locator(".garden-text time");
    await expect(date).toHaveCount(0);
    await expect(view.locator(".garden-text")).toHaveText("Event");

    await page
      .getByRole("button", { name: "Page settings", exact: true })
      .click();
    const input = page.getByLabel("Page date", { exact: true });
    for (const [iso, text] of [
      ["2024-07-07", "07 JULY 2024"],
      ["2025-11-27", "27 NOVEMBER 2025"],
    ]) {
      await input.fill(iso);
      await expect.poll(dateOnCanvas).toBe(JSON.stringify(text));
      await expect(saved).toHaveText("Saved");
      await view.reload();
      await expect(date).toHaveText(text);
      await expect(date).toHaveAttribute("datetime", iso);
    }
    await page.reload();
    await expect(marker).toBeVisible();
    await expect.poll(dateOnCanvas).toBe('"27 NOVEMBER 2025"');
  } finally {
    await visitor.close();
  }
});
