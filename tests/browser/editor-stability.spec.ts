import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
const env = Object.fromEntries(
  (await readFile(".env.test", "utf8"))
    .split(/\r?\n/)
    .filter((l) => l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
);
async function openEditor(page: import("@playwright/test").Page) {
  const origin = env.NEXT_PUBLIC_APP_URL;
  expect(
    (
      await page.request.post("/api/auth/sign-in/email", {
        headers: { Origin: origin },
        data: {
          email: env.TEST_ADMIN_EMAIL,
          password: env.TEST_ADMIN_PASSWORD,
        },
      })
    ).ok(),
  ).toBeTruthy();
  const created = await (
    await page.request.post("/api/pages", {
      headers: { Origin: origin },
      data: { title: "Editor stability " + Date.now(), template: "journal" },
    })
  ).json();
  await page.goto("/admin/pages/" + created.id);
  await expect(
    page.getByRole("button", { name: "Open content panel", exact: true }),
  ).toBeEnabled();
  return page.frameLocator("iframe");
}
test("formatting row keeps the canvas still across text selection, hover and non-text selection", async ({
  page,
  isMobile,
}) => {
  const frame = await openEditor(page);
  if (!isMobile) {
    await page
      .getByRole("button", { name: "Close panel", exact: true })
      .click();
    expect(
      (await page.locator(".garden-canvas-workspace").boundingBox())!.width,
    ).toBeGreaterThan(500);
    await page
      .getByRole("button", { name: "Open content panel", exact: true })
      .click();
  }
  const canvas = page.locator(".garden-canvas-scroll");
  const top = (await canvas.boundingBox())!.y;
  const heading = frame.getByRole("textbox", { name: "Heading", exact: true });
  await heading.click();
  await expect(
    page.getByRole("button", { name: "Bold", exact: true }),
  ).toBeVisible();
  expect((await canvas.boundingBox())!.y).toBe(top);
  const more = page.getByRole("region", {
    name: "More text formatting",
    exact: true,
  });
  await page
    .getByRole("button", { name: "More text formatting", exact: true })
    .click();
  await expect(more).toBeVisible();
  const bounds = (await more.boundingBox())!,
    viewport = page.viewportSize()!;
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.y).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height);
  expect((await canvas.boundingBox())!.y).toBe(top);
  await page.keyboard.press("Escape");
  await expect(more).not.toBeVisible();
  await expect(heading).toBeFocused();
  await heading.click();
  await page
    .getByRole("button", { name: "More text formatting", exact: true })
    .click();
  await page.locator(".editor-canvas-top").click({ position: { x: 4, y: 4 } });
  await expect(more).not.toBeVisible();
  await heading.click();
  if (!isMobile) {
    await frame
      .getByRole("textbox", { name: "Text content", exact: true })
      .first()
      .hover();
    await expect(
      page.getByRole("button", { name: "Bold", exact: true }),
    ).toBeEnabled();
    await expect(
      page.getByRole("combobox", { name: "Text style", exact: true }),
    ).toHaveValue("h1");
    await frame
      .getByRole("textbox", { name: "Description", exact: true })
      .hover();
    expect((await canvas.boundingBox())!.y).toBe(top);
  }
  await page
    .getByRole("button", { name: "Open outline panel", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Select Image 1", exact: true })
    .click();
  expect((await canvas.boundingBox())!.y).toBe(top);
  // Formatting must not modify a previously selected text block while a photo is selected.
  await expect(
    page.getByRole("button", { name: "Bold", exact: true }),
  ).toBeDisabled();
});
test("link dialog is centered, evenly spaced and keeps the selected words when applied", async ({
  page,
  isMobile,
}, testInfo) => {
  const frame = await openEditor(page);
  const heading = frame.getByRole("textbox", { name: "Heading", exact: true });
  await heading.click();
  await heading.fill("Our linked memory");
  await heading.evaluate((element) => {
    const range = element.ownerDocument.createRange();
    range.selectNodeContents(element);
    const selection = element.ownerDocument.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
  });
  await page.getByRole("button", { name: "Add a link", exact: true }).click();
  const dialog = page.getByRole("dialog", {
    name: "Link text to a page or website",
  });
  await expect(dialog).toBeVisible();
  const bounds = (await dialog.boundingBox())!,
    viewport = page.viewportSize()!;
  expect(
    Math.abs(bounds.x + bounds.width / 2 - viewport.width / 2),
  ).toBeLessThanOrEqual(2);
  expect(
    Math.abs(bounds.y + bounds.height / 2 - viewport.height / 2),
  ).toBeLessThanOrEqual(2);
  const type = (await dialog
    .getByLabel("Destination type", { exact: true })
    .boundingBox())!;
  const url = dialog.getByLabel("External web address", { exact: true });
  const urlBounds = (await url.boundingBox())!;
  expect(Math.abs(type.width - urlBounds.width)).toBeLessThanOrEqual(2);
  await url.fill("https://example.com/garden");
  await page.screenshot({
    path: testInfo.outputPath(
      "centered-link-" + (isMobile ? "mobile" : "desktop") + ".png",
    ),
  });
  await dialog.getByRole("button", { name: "Apply link", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(heading.locator("a")).toHaveText("Our linked memory");
  await expect(heading.locator("a")).toHaveAttribute(
    "href",
    "https://example.com/garden",
  );
  await page
    .getByRole("button", { name: "Open content panel", exact: true })
    .click();
  await page.getByRole("button", { name: "Add Columns", exact: true }).click();
  const columns = page.getByRole("dialog", {
    name: "Choose your columns",
    exact: true,
  });
  const columnBounds = (await columns.boundingBox())!;
  expect(
    Math.abs(columnBounds.x + columnBounds.width / 2 - viewport.width / 2),
  ).toBeLessThanOrEqual(2);
  expect(
    Math.abs(columnBounds.y + columnBounds.height / 2 - viewport.height / 2),
  ).toBeLessThanOrEqual(2);
  await columns
    .getByRole("button", { name: "Close column chooser", exact: true })
    .click();
  const done = page.getByRole("button", { name: "Close panel", exact: true });
  if (isMobile && (await done.isVisible())) await done.click();
  await frame
    .getByRole("button", { name: "Choose photo", exact: true })
    .click();
  const photos = page.getByRole("dialog", {
    name: "Choose a photo",
    exact: true,
  });
  const photoBounds = (await photos.boundingBox())!;
  expect(
    Math.abs(photoBounds.x + photoBounds.width / 2 - viewport.width / 2),
  ).toBeLessThanOrEqual(2);
  expect(
    Math.abs(photoBounds.y + photoBounds.height / 2 - viewport.height / 2),
  ).toBeLessThanOrEqual(2);
  await photos
    .getByRole("button", { name: "Close photo library", exact: true })
    .click();
  await expect(
    page.getByRole("status", { name: "Auto-save status" }),
  ).toHaveText("Saved");
  await page.reload();
  await expect(heading.locator("a")).toHaveAttribute(
    "href",
    "https://example.com/garden",
  );
  await heading.click();
  await heading.evaluate((element) => {
    const range = element.ownerDocument.createRange();
    range.selectNodeContents(element);
    const selection = element.ownerDocument.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
  });
  await page.getByRole("button", { name: "Add a link", exact: true }).click();
  await page
    .getByRole("dialog", { name: "Link text to a page or website" })
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  await heading.evaluate((element) => {
    const text = element.querySelector("a")!.firstChild!;
    const range = element.ownerDocument.createRange();
    range.setStart(text, 11);
    range.setEnd(text, 17);
    (element as HTMLElement).focus();
    const selection = element.ownerDocument.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
  });
  await page.getByRole("button", { name: "Bold", exact: true }).press("Enter");
  await expect(heading.locator("strong")).toHaveText("memory");
  await expect(
    page.getByRole("status", { name: "Auto-save status" }),
  ).toHaveText("Saved");
  await page.reload();
  await expect(heading.locator("strong")).toHaveText("memory");
});
