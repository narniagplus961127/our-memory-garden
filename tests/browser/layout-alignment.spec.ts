import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
const env = Object.fromEntries(
  (await readFile(".env.test", "utf8"))
    .split(/\r?\n/)
    .filter((line) => line.includes("="))
    .map((line) => [
      line.slice(0, line.indexOf("=")),
      line.slice(line.indexOf("=") + 1),
    ]),
);
async function signIn(page: Page) {
  expect(
    (
      await page.request.post("/api/auth/sign-in/email", {
        headers: { Origin: env.NEXT_PUBLIC_APP_URL },
        data: {
          email: env.TEST_ADMIN_EMAIL,
          password: env.TEST_ADMIN_PASSWORD,
        },
      })
    ).ok(),
  ).toBeTruthy();
}
async function sample(page: Page, content?: unknown) {
  await signIn(page);
  const created = await (
    await page.request.post("/api/pages", {
      headers: { Origin: env.NEXT_PUBLIC_APP_URL },
      data: { title: "Layout alignment " + Date.now(), template: "journal" },
    })
  ).json();
  if (content)
    expect(
      (
        await page.request.patch("/api/pages/" + created.id, {
          headers: { Origin: env.NEXT_PUBLIC_APP_URL },
          data: { content, visibility: "public", version: created.version },
        })
      ).ok(),
    ).toBeTruthy();
  await page.goto("/admin/pages/" + created.id);
  await expect(
    page.getByRole("button", { name: "Open content panel", exact: true }),
  ).toBeEnabled();
  return created.id;
}
test("the public header centers the brand and menu button vertically", async ({
  page,
}) => {
  await signIn(page);
  const original = await (await page.request.get("/api/navigation")).json();
  try {
    const items = ["Event1", "Event2"].map((label) => ({
      id: crypto.randomUUID(),
      label,
      parentId: null,
      destination: { kind: "external", url: "https://example.com/" },
    }));
    expect(
      (
        await page.request.put("/api/navigation", {
          headers: { Origin: env.NEXT_PUBLIC_APP_URL },
          data: { items, version: original.version },
        })
      ).ok(),
    ).toBeTruthy();
    await page.goto("/");
    const header = page.locator(".public-header");
    const brand = (await header
      .getByRole("link", { name: "Our Memory Garden" })
      .boundingBox())!;
    const menu = (await header
      .getByRole("button", { name: "Open website menu" })
      .boundingBox())!;
    expect(
      Math.abs(brand.y + brand.height / 2 - menu.y - menu.height / 2),
    ).toBeLessThanOrEqual(1);
    await expect(header.getByRole("link")).toHaveCount(1);
  } finally {
    const current = await (await page.request.get("/api/navigation")).json();
    expect(
      (
        await page.request.put("/api/navigation", {
          headers: { Origin: env.NEXT_PUBLIC_APP_URL },
          data: { items: original.items, version: current.version },
        })
      ).ok(),
    ).toBeTruthy();
  }
});
test("font size lines up with toolbar inputs and movement settings have clear gaps", async ({
  page,
  isMobile,
}) => {
  await sample(page);
  const frame = page.frameLocator("iframe");
  await frame
    .getByRole("textbox", { name: "Text content", exact: true })
    .first()
    .click();
  const size = page.getByRole("spinbutton", { name: "Font size", exact: true });
  await expect(size).toBeEnabled();
  const sizeBox = (await size.boundingBox())!,
    styleBox = (await page
      .getByRole("combobox", { name: "Text style", exact: true })
      .boundingBox())!;
  expect(Math.abs(sizeBox.y - styleBox.y)).toBeLessThanOrEqual(1);
  expect(Math.abs(sizeBox.height - styleBox.height)).toBeLessThanOrEqual(2);
  if (isMobile)
    await page
      .getByRole("button", { name: "Open settings panel", exact: true })
      .click();
  const position = page.getByLabel("Position", { exact: true }),
    move = page.getByRole("button", { name: "Move block here", exact: true });
  await move.scrollIntoViewIfNeeded();
  const positionBox = (await position.boundingBox())!,
    moveBox = (await move.boundingBox())!;
  expect(moveBox.y - positionBox.y - positionBox.height).toBeGreaterThanOrEqual(
    12,
  );
  expect(Math.abs(moveBox.x - positionBox.x)).toBeLessThanOrEqual(1);
  const alignmentBox = (await page
    .getByLabel("Alignment", { exact: true })
    .boundingBox())!;
  expect(Math.abs(alignmentBox.x - positionBox.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(alignmentBox.width - positionBox.width)).toBeLessThanOrEqual(
    1,
  );
});
test("image placeholders and choose actions fit their column and public page", async ({
  page,
  browser,
  baseURL,
  isMobile,
}) => {
  const id = await sample(page, {
    root: { props: {} },
    content: [
      {
        type: "Columns",
        props: {
          id: "layout-columns",
          count: 4,
          ratio: "equal",
          gap: "comfortable",
          left: [
            {
              type: "Image",
              props: {
                id: "layout-image",
                alt: "A garden photo",
                fit: "contain",
                width: "inset",
              },
            },
          ],
          right: [],
          third: [],
          fourth: [],
        },
      },
    ],
  });
  const frame = page.frameLocator("iframe"),
    figure = frame.locator(".garden-image"),
    placeholder = frame.locator(".garden-photo-placeholder");
  await expect(placeholder).toBeVisible();
  await page
    .getByRole("button", { name: "Open outline panel", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Select Image 1", exact: true })
    .click();
  if (isMobile)
    await page
      .getByRole("button", { name: "Close panel", exact: true })
      .click();
  if (!isMobile) await page.setViewportSize({ width: 1000, height: 800 });
  const figureBox = (await figure.boundingBox())!,
    box = (await placeholder.boundingBox())!;
  expect(box.width).toBeLessThanOrEqual(figureBox.width + 1);
  expect(box.height).toBeLessThanOrEqual(
    Math.max(160, (figureBox.width * 9) / 16 + 2),
  );
  const button = (await frame
    .getByRole("button", { name: "Choose photo", exact: true })
    .boundingBox())!;
  expect(button.x).toBeGreaterThanOrEqual(figureBox.x - 1);
  expect(button.x + button.width).toBeLessThanOrEqual(
    figureBox.x + figureBox.width + 1,
  );
  const actions = (await frame
    .locator(".garden-canvas-actions > div")
    .boundingBox())!;
  expect(
    button.x < actions.x + actions.width &&
      button.x + button.width > actions.x &&
      button.y < actions.y + actions.height &&
      button.y + button.height > actions.y,
  ).toBeFalsy();
  const visitor = await browser.newContext({ viewport: page.viewportSize()! });
  const view = await visitor.newPage();
  await view.goto(baseURL + "/p/" + id);
  const publicFigure = (await view.locator(".garden-image").boundingBox())!,
    publicPlaceholder = (await view
      .locator(".garden-photo-placeholder")
      .boundingBox())!;
  expect(publicPlaceholder.width).toBeLessThanOrEqual(publicFigure.width + 1);
  await visitor.close();
});
