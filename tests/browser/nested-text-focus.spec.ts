import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { chooseAddTarget } from "./editor-controls";

const env = Object.fromEntries(
  (await readFile(".env.test", "utf8"))
    .split(/\r?\n/)
    .filter((line) => line.includes("="))
    .map((line) => [
      line.slice(0, line.indexOf("=")),
      line.slice(line.indexOf("=") + 1),
    ]),
);
test("typing the first character inside a new column retains focus through autosave", async ({
  page,
  isMobile,
}) => {
  const headers = { Origin: env.NEXT_PUBLIC_APP_URL };
  expect(
    (
      await page.request.post("/api/auth/sign-in/email", {
        headers,
        data: {
          email: env.TEST_ADMIN_EMAIL,
          password: env.TEST_ADMIN_PASSWORD,
        },
      })
    ).ok(),
  ).toBeTruthy();
  const garden = await (
    await page.request.post("/api/pages", {
      headers,
      data: { title: "Nested typing " + Date.now() },
    })
  ).json();
  await page.goto("/admin/pages/" + garden.id);
  await page
    .getByRole("button", { name: "Open content panel", exact: true })
    .click();
  await page.getByRole("button", { name: "Add Columns", exact: true }).click();
  await page.getByRole("button", { name: "Apply layout", exact: true }).click();
  await chooseAddTarget(page, "Columns 1 · left column");
  await page.getByRole("button", { name: "Add Text", exact: true }).click();
  if (
    isMobile &&
    (await page
      .getByRole("button", { name: "Close panel", exact: true })
      .isVisible())
  )
    await page
      .getByRole("button", { name: "Close panel", exact: true })
      .click();
  const field = page
    .frameLocator("iframe")
    .locator(".garden-columns")
    .getByRole("textbox", { name: "Text content", exact: true });
  await field.click();
  if (isMobile)
    await field.evaluate((element) => {
      // Emulate the phone's Select all action; subsequent characters use real keyboard input.
      const range = element.ownerDocument.createRange();
      range.selectNodeContents(element);
      const selection = element.ownerDocument.getSelection()!;
      selection.removeAllRanges();
      selection.addRange(range);
    });
  else await field.press("ControlOrMeta+a");
  await page.keyboard.type("A");
  await expect(field).toHaveText("A");
  await expect(field).toBeFocused({ timeout: 1500 });
  await expect(
    page.getByRole("status", { name: "Auto-save status" }),
  ).toHaveText("Saved");
  await expect(field).toBeFocused({ timeout: 1500 });
  await page.keyboard.type(" memory grows", { delay: 90 });
  await expect(field).toHaveText("A memory grows");
  await expect(field).toBeFocused({ timeout: 1500 });
  await expect(
    page.getByRole("status", { name: "Auto-save status" }),
  ).toHaveText("Saved");
  await page.reload();
  await expect(field).toHaveText("A memory grows");
});
