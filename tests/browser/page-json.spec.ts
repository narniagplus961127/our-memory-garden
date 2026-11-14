import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";

const env = parseEnv(readFileSync(".env.test", "utf8"));
const headers = {
  Origin: process.env.PLAYWRIGHT_BASE_URL ?? env.NEXT_PUBLIC_APP_URL!,
};

test("review, replace, download, and copy a page", async ({
  page,
  isMobile,
}) => {
  test.setTimeout(120000);
  const signedIn = await page.request.post("/api/auth/sign-in/email", {
    headers,
    data: { email: env.TEST_ADMIN_EMAIL, password: env.TEST_ADMIN_PASSWORD },
  });
  expect(signedIn.ok()).toBeTruthy();
  const suffix = crypto.randomUUID().slice(0, 8);
  const title = "Original " + suffix;
  const slug = "original-" + suffix;
  const created = await page.request.post("/api/pages", {
    headers,
    data: { title, slug },
  });
  expect(created.status()).toBe(201);
  const source = await created.json();
  await page.goto("/admin/pages/" + source.id);

  async function openImport() {
    await page.getByRole("button", { name: "Page actions" }).click();
    await page.getByRole("menuitem", { name: "Import page JSON" }).click();
    return page.getByRole("dialog", { name: "Import page JSON" });
  }
  const document = {
    format: "our-memory-garden/page",
    version: 1,
    page: {
      title: "Edited " + suffix,
      date: "2024-11-27",
      blocks: [
        {
          type: "Section",
          id: "body",
          blocks: [
            {
              type: "Text",
              id: "note",
              settings: { style: "p" },
              text: "Edited in JSON.",
            },
          ],
        },
      ],
    },
  };
  let dialog = await openImport();
  const fileElement = dialog.getByLabel("Page JSON file");
  await fileElement.setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from("{"),
  });
  await expect(dialog.getByRole("alert")).toContainText("not valid JSON");
  await expect(
    dialog.getByRole("button", { name: "Replace page content" }),
  ).toBeDisabled();
  const file = {
    name: "new-page.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(document)),
  };
  await fileElement.setInputFiles(file);
  await expect(dialog).toContainText("2 blocks");
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(
    page.getByRole("button", { name: "Page actions" }),
  ).toBeFocused();
  await expect(
    page.getByRole("textbox", { name: "Page title", exact: true }),
  ).toHaveValue(title);

  dialog = await openImport();
  await dialog.getByLabel("Page JSON file").setInputFiles(file);
  await expect(dialog).toContainText(
    "restore the previous version from History",
  );
  const fit = await dialog.boundingBox();
  if (isMobile && fit) expect(fit.x + fit.width).toBeLessThanOrEqual(390);
  await dialog.getByRole("button", { name: "Replace page content" }).click();
  await expect(
    page.getByRole("textbox", { name: "Page title", exact: true }),
  ).toHaveValue(document.page.title);
  await expect(
    page
      .frameLocator("#preview-frame")
      .getByText("Edited in JSON.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Page actions" }).click();
  const downloading = page.waitForEvent("download");
  await page.getByRole("menuitem", { name: "Download page JSON" }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toBe(slug + ".json");
  const path = await download.path();
  expect(JSON.parse(readFileSync(path!, "utf8")).page.title).toBe(
    document.page.title,
  );

  const pages = page.getByRole("link", { name: "← Pages" });
  await expect(pages).toHaveAttribute("href", "/admin/pages");
  await page.goto("/admin/pages");
  await page.getByRole("link", { name: "Copy from page" }).click();
  await page.getByLabel("Source page").selectOption(source.id);
  await expect(page.getByLabel("New page title")).toHaveValue(
    document.page.title + " (copy)",
  );
  await expect(page.getByLabel("New page URL")).toHaveValue(
    "edited-" + suffix + "-copy",
  );
  await page.getByLabel("New page URL").fill(slug);
  await page.getByRole("button", { name: "Create private copy" }).click();
  await expect(
    page.getByText("This page URL is already in use.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Use title" }).click();
  await page.getByRole("button", { name: "Create private copy" }).click();
  await expect(
    page.getByRole("textbox", { name: "Page title", exact: true }),
  ).toHaveValue(document.page.title + " (copy)");
  await expect(
    page
      .frameLocator("#preview-frame")
      .getByText("Edited in JSON.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Private", { exact: true }).first(),
  ).toBeVisible();
  expect(new URL(page.url()).pathname).not.toBe("/admin/pages/" + source.id);
});
