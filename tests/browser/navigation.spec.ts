import {
  canvasField,
  writeCanvas,
  selectBlock,
  setVisibility,
} from "./editor-controls";
import { test, expect } from "@playwright/test";
import fs from "node:fs";
const env = Object.fromEntries(
  fs
    .readFileSync(".env.test", "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1)];
    }),
);
test("manage nested navigation and change addresses through desktop and mobile controls", async ({
  page,
  isMobile,
  browser,
  baseURL,
}, testInfo) => {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(env.TEST_ADMIN_EMAIL);
  await page
    .getByLabel("Password", { exact: true })
    .fill(env.TEST_ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/pages$/);
  const origin = new URL(page.url()).origin;
  const menu = await (await page.request.get("/api/navigation")).json();
  await page.request.put("/api/navigation", {
    headers: { Origin: origin },
    data: { items: [], version: menu.version },
  });
  const p = await (
    await page.request.post("/api/pages", {
      headers: { Origin: origin },
      data: { title: "Navigation journey " + Date.now() },
    })
  ).json();
  await page.request.patch("/api/pages/" + p.id, {
    headers: { Origin: origin },
    data: { visibility: "public", version: p.version },
  });
  await page.goto("/admin/navigation");
  await page.getByRole("link", { name: "Add menu item", exact: true }).click();
  await page.getByLabel("Menu label", { exact: true }).fill("Our rosemary");
  await page
    .getByLabel("Destination type", { exact: true })
    .selectOption("page");
  await page.getByLabel("Garden page", { exact: true }).selectOption(p.id);
  async function expectFieldAlignment() {
    const fields = await page
      .locator(".navigation-item-form")
      .evaluate((form) => {
        const labels = [...form.querySelectorAll("label")];
        return labels.map((label, index) => {
          const control = form
            .querySelector<HTMLElement>('[id="' + label.htmlFor + '"]')!
            .getBoundingClientRect();
          const previous =
            index > 0
              ? form
                  .querySelector<HTMLElement>(
                    '[id="' + labels[index - 1].htmlFor + '"]',
                  )!
                  .getBoundingClientRect()
              : null;
          return {
            x: control.x,
            width: control.width,
            height: control.height,
            labelGap: control.top - label.getBoundingClientRect().bottom,
            fieldGap: previous
              ? label.getBoundingClientRect().top - previous.bottom
              : null,
          };
        });
      });
    expect(fields.map((field) => field.fieldGap)).toEqual([null, 24, 24, 24]);
    for (const field of fields) {
      expect(field.labelGap).toBe(8);
      expect(field.height).toBe(44);
      expect(field.x).toBe(fields[0].x);
      expect(field.width).toBe(fields[0].width);
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
  }
  await expectFieldAlignment();
  await page.screenshot({
    path: testInfo.outputPath("navigation-page-fields.png"),
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Add menu item", exact: true })
    .click();
  await expect(
    page.getByRole("status", { name: "Navigation status" }),
  ).toHaveText("Saved");
  await page.getByRole("link", { name: "Add menu item", exact: true }).click();
  await page.getByLabel("Menu label", { exact: true }).fill("Garden elsewhere");
  await page
    .getByLabel("Destination type", { exact: true })
    .selectOption("external");
  await page
    .getByLabel("External web address", { exact: true })
    .fill("https://example.com/garden");
  await expectFieldAlignment();
  await page.screenshot({
    path: testInfo.outputPath("navigation-external-fields.png"),
    fullPage: true,
  });
  await page
    .getByLabel("Parent item", { exact: true })
    .selectOption({ label: "Our rosemary" });
  await page
    .getByRole("button", { name: "Add menu item", exact: true })
    .click();
  await expect(
    page.getByRole("status", { name: "Navigation status" }),
  ).toHaveText("Saved");
  await page
    .getByRole("link", { name: "Edit Garden elsewhere", exact: true })
    .click();
  await page.getByLabel("Parent item", { exact: true }).selectOption("");
  await page
    .getByRole("button", { name: "Update menu item", exact: true })
    .click();
  await expect(
    page.getByRole("status", { name: "Navigation status" }),
  ).toHaveText("Saved");
  await page
    .getByRole("button", { name: "Drag Garden elsewhere", exact: true })
    .focus();
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("status", { name: "Navigation status" }),
  ).toHaveText("Saved");
  await expect(
    page.getByRole("region", { name: "Menu items" }).locator("strong"),
  ).toHaveText(["Garden elsewhere", "Our rosemary"]);
  await page
    .getByRole("link", { name: "Edit Garden elsewhere", exact: true })
    .click();
  await page
    .getByLabel("Parent item", { exact: true })
    .selectOption({ label: "Our rosemary" });
  await page
    .getByRole("button", { name: "Update menu item", exact: true })
    .click();
  await expect(
    page.getByRole("status", { name: "Navigation status" }),
  ).toHaveText("Saved");
  await page.screenshot({
    path: testInfo.outputPath("navigation-settings.png"),
    fullPage: true,
  });
  await page.goto("/admin/pages/" + p.id);
  await page
    .getByRole("button", { name: "Page settings", exact: true })
    .click();
  await page
    .getByLabel("Page address", { exact: true })
    .fill("rosemary-" + p.id);
  await page.getByLabel("Page address", { exact: true }).blur();
  await expect(page.getByRole("status", { name: "Address status" })).toHaveText(
    "Saved",
  );
  const visitor = await browser.newContext({
    viewport: isMobile
      ? { width: 390, height: 844 }
      : { width: 1280, height: 800 },
  });
  const pub = await visitor.newPage();
  await pub.goto(baseURL + "/");
  if (isMobile) await pub.getByLabel("Open website menu").click();
  const nav = pub.getByRole("navigation", {
    name: isMobile ? "Mobile navigation" : "Main navigation",
    exact: true,
  });
  await expect(
    nav.getByRole("link", { name: "Our rosemary", exact: true }),
  ).toHaveAttribute("href", "/garden/rosemary-" + p.id);
  await expect(
    nav.getByRole("link", { name: "Garden elsewhere", exact: true }),
  ).toBeVisible();
  await pub.screenshot({
    path: testInfo.outputPath("public-navigation.png"),
    fullPage: true,
  });
  await nav.getByRole("link", { name: "Our rosemary", exact: true }).click();
  await expect(pub).toHaveURL("/garden/rosemary-" + p.id);
  await visitor.close();
  await page.goto("/admin/navigation");
  await page
    .getByRole("button", { name: "Remove Garden elsewhere", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Remove menu item", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("status", { name: "Navigation status" }),
  ).toHaveText("Saved");
  await expect(
    page.getByRole("link", { name: "Edit Garden elsewhere", exact: true }),
  ).toHaveCount(0);
});
test("text and button page pickers keep private links visible, follow changed addresses, and retain invalid addresses", async ({
  page,
  browser,
  baseURL,
}, testInfo) => {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(env.TEST_ADMIN_EMAIL);
  await page
    .getByLabel("Password", { exact: true })
    .fill(env.TEST_ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/pages$/);
  const origin = new URL(page.url()).origin;
  const target = await (
    await page.request.post("/api/pages", {
      headers: { Origin: origin },
      data: { title: "A quiet garden " + Date.now() },
    })
  ).json();
  const source = await (
    await page.request.post("/api/pages", {
      headers: { Origin: origin },
      data: { title: "Linked stories " + Date.now() },
    })
  ).json();
  await page.request.patch("/api/pages/" + source.id, {
    headers: { Origin: origin },
    data: {
      visibility: "public",
      version: source.version,
      content: {
        root: { props: {} },
        content: [
          {
            type: "Section",
            props: {
              id: "linked-section",
              content: [
                {
                  type: "Text",
                  props: { id: "linked-text", text: "", style: "p" },
                },
              ],
            },
          },
        ],
      },
    },
  });
  await page.goto("/admin/pages/" + source.id);
  await selectBlock(page, "Select Text 1");
  await page.getByRole("button", { name: "Open settings panel" }).click();
  await writeCanvas(page, "Text content", "Visit our quiet rosemary today.");
  const close = page.getByRole("button", { name: "Close panel", exact: true });
  if ((page.viewportSize()?.width ?? 1280) <= 760 && (await close.isVisible()))
    await close.click();
  await canvasField(page, "Text content").evaluate((element) => {
    const text = element.querySelector("p")!.firstChild!;
    const range = element.ownerDocument.createRange();
    range.setStart(text, 10);
    range.setEnd(text, 24);
    (element as HTMLElement).focus();
    const selection = element.ownerDocument.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
  });
  await page.getByRole("button", { name: "Add a link", exact: true }).click();
  const linkDialog = page.getByRole("dialog", {
    name: "Link text to a page or website",
  });
  await linkDialog
    .getByLabel("Destination type", { exact: true })
    .selectOption("page");
  await linkDialog
    .getByLabel("Garden page", { exact: true })
    .selectOption(target.id);
  await linkDialog
    .getByRole("button", { name: "Apply link", exact: true })
    .click();
  await expect(
    page.getByRole("status", { name: "Auto-save status" }),
  ).toHaveText("Saved");
  await page.getByRole("button", { name: "Open content panel" }).click();
  await page.getByRole("button", { name: "Add Button", exact: true }).click();
  await page.getByRole("button", { name: "Open settings panel" }).click();
  await writeCanvas(page, "Button label", "Another garden path");
  await page
    .getByLabel("Destination type", { exact: true })
    .selectOption("page");
  await page.getByLabel("Garden page", { exact: true }).selectOption(target.id);
  await expect(
    page.getByRole("status", { name: "Auto-save status" }),
  ).toHaveText("Saved");
  const visitor = await browser.newContext();
  const pub = await visitor.newPage();
  await pub.goto(baseURL + "/garden/" + source.slug);
  await expect(
    pub.getByRole("link", { name: "quiet rosemary", exact: true }),
  ).toHaveAttribute("href", "/p/" + target.id);
  await expect(
    pub.getByRole("link", { name: "Another garden path", exact: true }),
  ).toHaveAttribute("href", "/p/" + target.id);
  await pub.getByRole("link", { name: "quiet rosemary", exact: true }).click();
  await expect(
    pub.getByRole("heading", { name: "Page not found", exact: true }),
  ).toBeVisible();
  await page.goto("/admin/pages/" + target.id);
  await page
    .getByRole("button", { name: "Page settings", exact: true })
    .click();
  const address = page.getByLabel("Page address", { exact: true });
  await address.fill("Invalid address");
  await address.blur();
  await expect(address).toHaveAttribute("aria-invalid", "true");
  await expect(address).toHaveValue("Invalid address");
  await address.fill(source.slug);
  await address.blur();
  await expect(
    page.getByRole("alert").filter({ hasText: "already in use" }),
  ).toContainText("already in use");
  await expect(address).toHaveValue(source.slug);
  await address.fill("quiet-" + target.id);
  await address.blur();
  await expect(page.getByRole("status", { name: "Address status" })).toHaveText(
    "Saved",
  );
  await setVisibility(page, "public");
  await expect(
    page.getByRole("status", { name: "Auto-save status" }),
  ).toHaveText("Saved");
  await page.screenshot({
    path: testInfo.outputPath("address-settings.png"),
    fullPage: true,
  });
  await pub.goto(baseURL + "/garden/" + source.slug);
  await pub
    .getByRole("link", { name: "Another garden path", exact: true })
    .click();
  await expect(pub).toHaveURL("/garden/quiet-" + target.id);
  await expect(
    pub.getByRole("heading", { name: target.title, exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Open content panel" }).click();
  await page
    .getByRole("button", { name: "Page settings", exact: true })
    .click();
  await expect(address).toHaveValue("quiet-" + target.id);
  await visitor.close();
});
