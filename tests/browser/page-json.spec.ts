import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";

const env = parseEnv(readFileSync(".env.test", "utf8"));
const headers = {
  Origin: process.env.PLAYWRIGHT_BASE_URL ?? env.NEXT_PUBLIC_APP_URL!,
};

test("review and replace editor content from JSON and another page", async ({
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
    await page.getByRole("menuitem", { name: "Import page content" }).click();
    return page.getByRole("dialog", { name: "Import page content" });
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
  ).toHaveValue(title);
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
  const downloaded = JSON.parse(readFileSync(path!, "utf8"));
  expect(Object.keys(downloaded.page)).toEqual(["blocks"]);

  const other = await page.request.post("/api/pages", {
    headers,
    data: { title: "Source " + suffix, slug: "source-" + suffix },
  });
  expect(other.status()).toBe(201);
  const otherPage = await other.json();
  const original = await page.request.patch("/api/pages/" + otherPage.id, {
    headers,
    data: { version: otherPage.version, text: "A different saved memory" },
  });
  expect(original.ok()).toBeTruthy();

  // Navigate to the destination afresh after verifying the file download.
  await page.goto("/admin/pages/" + source.id);
  dialog = await openImport();
  await dialog.getByRole("tab", { name: "Use another page" }).click();
  const picker = dialog.getByLabel("Source page");
  await expect(picker.locator("option", { hasText: title })).toHaveCount(0);
  await picker.selectOption(otherPage.id);
  await expect(dialog).toContainText("1 block");
  await dialog.getByRole("button", { name: "Replace page content" }).click();
  await expect(
    page.getByRole("textbox", { name: "Page title", exact: true }),
  ).toHaveValue(title);
  await expect(
    page
      .frameLocator("#preview-frame")
      .getByText("A different saved memory", { exact: true }),
  ).toBeVisible();
  const destination = await (
    await page.request.get("/api/pages/" + source.id)
  ).json();
  expect(destination.slug).toBe(slug);
  expect(destination.visibility).toBe("private");

  await page.goto("/admin/pages");
  await expect(page.getByRole("link", { name: "Copy from page" })).toHaveCount(
    0,
  );
});
