import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { legacyTextContent } from "./editor-controls";
const env = Object.fromEntries(
  (await readFile(".env.test", "utf8"))
    .split(/\r?\n/)
    .filter((l) => l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
);
const headers = { Origin: env.NEXT_PUBLIC_APP_URL };
async function fixture(page: Page) {
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
  let garden = await (
    await page.request.post("/api/pages", {
      headers,
      data: { title: "Presentation " + Date.now() },
    })
  ).json();
  garden = await (
    await page.request.patch("/api/pages/" + garden.id, {
      headers,
      data: {
        version: garden.version,
        visibility: "public",
        content: legacyTextContent(),
      },
    })
  ).json();
  await page.goto("/admin/pages/" + garden.id);
  await page
    .getByRole("button", { name: "Page settings", exact: true })
    .click();
  return garden;
}
test("title visibility defaults on, survives editing and reload, and hides only the website heading", async ({
  page,
  browser,
  baseURL,
  isMobile,
}) => {
  const garden = await fixture(page);
  const toggle = page.getByRole("checkbox", {
    name: "Show page title",
    exact: true,
  });
  await expect(toggle).toBeChecked();
  await toggle.uncheck();
  await expect
    .poll(
      async () =>
        (await (await page.request.get("/api/pages/" + garden.id)).json())
          .content.root.props.showTitle,
    )
    .toBe(false);
  const hidden = await (
    await page.request.get("/api/pages/" + garden.id)
  ).json();
  expect(hidden.content.content[0].props.textRich).toBeUndefined();
  await page.reload();
  await page
    .getByRole("button", { name: "Page settings", exact: true })
    .click();
  await expect(toggle).not.toBeChecked();
  await page.getByRole("button", { name: "Close panel", exact: true }).click();
  const text = page
    .frameLocator("iframe")
    .getByRole("textbox", { name: "Text content", exact: true });
  await text.click();
  const caretBox = (await text.boundingBox())!,
    toolbarBox = (await page.locator("#garden-inline-format").boundingBox())!;
  expect(caretBox.y).toBeGreaterThanOrEqual(toolbarBox.y + toolbarBox.height);
  expect(
    (await page.locator(".garden-canvas-scroll").boundingBox())!.y,
  ).toBeGreaterThanOrEqual(toolbarBox.y + toolbarBox.height);
  await text.fill("Words stay visible");
  await expect(
    page.getByRole("status", { name: "Auto-save status" }),
  ).toHaveText("Saved");
  const visitor = await browser.newContext({ viewport: page.viewportSize()! });
  try {
    const view = await visitor.newPage();
    await view.goto(baseURL + "/p/" + garden.id);
    await expect(view.locator(".public-page-heading")).toHaveCSS(
      "display",
      "none",
    );
    await expect(view.locator(".garden-text")).toContainText(
      "Words stay visible",
    );
    await expect(view).toHaveTitle(new RegExp(garden.title));
    await page
      .getByRole("button", { name: "Page settings", exact: true })
      .click();
    await expect(page.locator("#garden-inline-format")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    await toggle.check();
    await expect
      .poll(
        async () =>
          (await (await page.request.get("/api/pages/" + garden.id)).json())
            .content.root.props.showTitle,
      )
      .toBe(true);
    await view.reload();
    await expect(
      view
        .locator(".public-page-heading")
        .getByRole("heading", { name: garden.title, exact: true }),
    ).toBeVisible();
    await view.goto(baseURL + "/");
    await expect(view.locator(".public-page-heading > .eyebrow")).toHaveCount(
      0,
    );
    const dashboard = view.getByRole("button", {
      name: "Garden tools",
      exact: true,
    });
    await expect(dashboard).toHaveCSS("position", "fixed");
    await expect(
      view
        .locator(".public-header")
        .getByRole("link", { name: "Garden dashboard", exact: true }),
    ).toHaveCount(0);
    const box = (await dashboard.boundingBox())!,
      viewport = view.viewportSize()!;
    expect(box.width).toBe(48);
    expect(box.height).toBe(48);
    expect(viewport.width - box.x - box.width).toBe(isMobile ? 16 : 24);
  } finally {
    await visitor.close();
  }
});
test("page settings use equal gutters, field spacing and control heights without a horizontal rail scrollbar", async ({
  page,
  isMobile,
}, testInfo) => {
  await fixture(page);
  const inputs = [
    page.getByLabel("Page date", { exact: true }),
    page.getByLabel("Page category", { exact: true }),
    page.getByLabel("Category name", { exact: true }),
    page.getByRole("button", { name: "Choose photo", exact: true }),
    page.getByLabel("Sharing title", { exact: true }),
  ];
  const boxes = [];
  for (const input of inputs) {
    await input.scrollIntoViewIfNeeded();
    const box = (await input.boundingBox())!;
    boxes.push(box);
    expect(box.height).toBe(44);
  }
  expect(
    Math.max(...boxes.map((box) => box.x)) -
      Math.min(...boxes.map((box) => box.x)),
  ).toBeLessThanOrEqual(1);
  expect(
    Math.max(...boxes.map((box) => box.width)) -
      Math.min(...boxes.map((box) => box.width)),
  ).toBeLessThanOrEqual(1);
  await expect(
    page.locator(".editor-page-settings .photo-picker .field-label"),
  ).toHaveCount(0);
  const rail = await page.locator(".editor-rail").evaluate((el) => ({
    scroll: el.scrollWidth,
    client: el.clientWidth,
    overflow: getComputedStyle(el).overflowX,
  }));
  expect(rail.scroll).toBeLessThanOrEqual(rail.client);
  expect(rail.overflow).toBe("hidden");
  if (isMobile)
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(page.viewportSize()!.width);
  await page.getByLabel("Page date", { exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({
    path: testInfo.outputPath("page-settings-spacing.png"),
    fullPage: false,
  });
});
