import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { selectBlock } from "./editor-controls";
const env = Object.fromEntries(
  (await readFile(".env.test", "utf8"))
    .split(/\r?\n/)
    .filter((line) => line.includes("="))
    .map((line) => [
      line.slice(0, line.indexOf("=")),
      line.slice(line.indexOf("=") + 1),
    ]),
);
async function fixture(page: Page) {
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
      data: { title: "Unfinished paths " + Date.now() },
    })
  ).json();
  expect(
    (
      await page.request.patch("/api/pages/" + garden.id, {
        headers,
        data: { version: garden.version, visibility: "public" },
      })
    ).ok(),
  ).toBeTruthy();
  await page.goto("/admin/pages/" + garden.id);
  await page
    .getByRole("button", { name: "Open content panel", exact: true })
    .click();
  await page.getByRole("button", { name: "Add Section", exact: true }).click();
  return garden;
}
test("unconfigured button destinations do not block autosave or create active website links", async ({
  page,
  browser,
  baseURL,
}) => {
  const garden = await fixture(page);
  await page.getByRole("button", { name: "Add Button", exact: true }).click();
  await selectBlock(page, "Select Button 1");
  await page
    .getByRole("button", { name: "Open settings panel", exact: true })
    .click();
  await page
    .getByLabel("Destination type", { exact: true })
    .selectOption("page");
  const updatedTitle = "Choosing a destination later " + Date.now();
  await page
    .getByRole("textbox", { name: "Page title", exact: true })
    .fill(updatedTitle);
  await expect(
    page.getByRole("status", { name: "Auto-save status" }),
  ).toHaveText("Saved", { timeout: 6000 });
  await expect(
    page.getByRole("alert").filter({ hasText: "Invalid page content" }),
  ).toHaveCount(0);
  await expect(
    page.getByLabel("Garden page", { exact: true }),
  ).not.toHaveAttribute("aria-invalid", "true");
  await page.reload();
  await expect(
    page.getByRole("textbox", { name: "Page title", exact: true }),
  ).toHaveValue(updatedTitle);
  await selectBlock(page, "Select Button 1");
  await page
    .getByRole("button", { name: "Open settings panel", exact: true })
    .click();
  await expect(
    page.getByLabel("Destination type", { exact: true }),
  ).toHaveValue("page");
  await expect(page.getByLabel("Garden page", { exact: true })).toHaveValue("");
  const visitor = await browser.newContext();
  try {
    const pub = await visitor.newPage();
    await pub.goto(baseURL + "/garden/" + garden.slug);
    await expect(
      pub.getByText("Explore a little more", { exact: true }),
    ).toBeVisible();
    await expect(
      pub.getByRole("link", { name: "Explore a little more", exact: true }),
    ).toHaveCount(0);
    const saved = () =>
      expect(page.getByRole("status", { name: "Auto-save status" })).toHaveText(
        "Saved",
      );
    const websiteLink = pub.getByRole("link", {
      name: "Explore a little more",
      exact: true,
    });
    await page
      .getByLabel("Garden page", { exact: true })
      .selectOption(garden.id);
    await saved();
    await pub.reload();
    await expect(websiteLink).toHaveAttribute("href", "/p/" + garden.id);
    await page.getByLabel("Garden page", { exact: true }).selectOption("");
    await saved();
    await pub.reload();
    await expect(websiteLink).toHaveCount(0);
    await page
      .getByLabel("Destination type", { exact: true })
      .selectOption("external");
    await saved();
    await expect(
      page
        .getByRole("alert")
        .filter({ hasText: /Invalid page content|Enter a complete/ }),
    ).toHaveCount(0);
    const address = page.getByLabel("External web address", { exact: true });
    await address.fill("https://example.com/memories");
    await saved();
    await pub.reload();
    await expect(websiteLink).toHaveAttribute(
      "href",
      "https://example.com/memories",
    );
    await page
      .getByLabel("Destination type", { exact: true })
      .selectOption("none");
    await saved();
    await pub.reload();
    await expect(websiteLink).toHaveCount(0);
    await page
      .getByLabel("Destination type", { exact: true })
      .selectOption("external");
    await address.fill("https://example.com/another-memory");
    await saved();
    await address.fill("");
    await saved();
    await pub.reload();
    await expect(websiteLink).toHaveCount(0);
  } finally {
    await visitor.close();
  }
});
test("simple block-removal confirmation has no empty band between its copy and actions", async ({
  page,
}, testInfo) => {
  await fixture(page);
  await page.getByRole("button", { name: "Add Text", exact: true }).click();
  await selectBlock(page, "Select Text 1");
  await page
    .getByRole("button", { name: "Open settings panel", exact: true })
    .click();
  await page.getByRole("button", { name: "Remove block", exact: true }).click();
  const dialog = page.getByRole("dialog", {
    name: "Remove Text?",
    exact: true,
  });
  const header = (await dialog.locator("header").boundingBox())!,
    footer = (await dialog.locator("footer").boundingBox())!;
  expect(footer.y - header.y - header.height).toBeLessThanOrEqual(1);
  await page.screenshot({
    path: testInfo.outputPath("compact-confirmation.png"),
  });
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
});
