import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import type { MenuItem } from "../../src/lib/destinations";
import type { NavigationState } from "../../src/lib/navigation";

const env = Object.fromEntries(
  (await readFile(".env.test", "utf8"))
    .split(/\r?\n/)
    .filter((line) => line.includes("="))
    .map((line) => [
      line.slice(0, line.indexOf("=")),
      line.slice(line.indexOf("=") + 1),
    ]),
);
const headers = { Origin: env.NEXT_PUBLIC_APP_URL };
const menuItem = (label: string, parentId: string | null = null): MenuItem => ({
  id: crypto.randomUUID(),
  label,
  parentId,
  destination: { kind: "external", url: "https://example.com/garden" },
});
async function signIn(page: Page) {
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
}
async function readMenu(page: Page): Promise<NavigationState> {
  const response = await page.request.get("/api/navigation");
  expect(response.ok()).toBeTruthy();
  return response.json();
}
async function saveMenu(page: Page, items: MenuItem[]) {
  const current = await readMenu(page);
  expect(
    (
      await page.request.put("/api/navigation", {
        headers,
        data: { items, version: current.version },
      })
    ).ok(),
  ).toBeTruthy();
}
async function externalForm(page: Page, label: string) {
  await page.getByLabel("Menu label", { exact: true }).fill(label);
  await page
    .getByLabel("Destination type", { exact: true })
    .selectOption("external");
  await page
    .getByLabel("External web address", { exact: true })
    .fill("https://example.com/flowers");
}
async function listReady(page: Page) {
  await expect(page).toHaveURL(/\/admin\/navigation$/);
  await expect(
    page.getByRole("heading", { name: "Your menu", exact: true }),
  ).toBeVisible();
}

test("dedicated menu forms cancel safely, retain failures and merge only the intended item", async ({
  page,
  isMobile,
}, testInfo) => {
  test.setTimeout(120000);
  await signIn(page);
  const original = await readMenu(page),
    parent = menuItem("A garden"),
    other = menuItem("Another path"),
    child = menuItem("A small path", parent.id);
  try {
    await saveMenu(page, [parent, child, other]);
    await page.goto("/admin/navigation");
    await expect(page.getByLabel("Menu label", { exact: true })).toHaveCount(0);
    await page
      .getByRole("link", { name: "Add menu item", exact: true })
      .click();
    await expect(page).toHaveURL(/\/admin\/navigation\/new$/);
    await externalForm(page, "Unsaved path");
    await page.getByRole("link", { name: "Cancel", exact: true }).click();
    await listReady(page);
    expect((await readMenu(page)).items).toEqual([parent, child, other]);

    await page
      .getByRole("link", { name: "Add menu item", exact: true })
      .click();
    await externalForm(page, "Our flowers");
    await page
      .getByLabel("Parent item", { exact: true })
      .selectOption(parent.id);
    await page.screenshot({
      path: testInfo.outputPath("navigation-create.png"),
      fullPage: true,
    });
    await page.route("**/api/navigation", async (route) => {
      if (route.request().method() !== "PUT") return route.continue();
      await route.fulfill({
        status: 503,
        json: { error: "Temporary menu save failure" },
      });
    });
    await page
      .getByRole("button", { name: "Add menu item", exact: true })
      .click();
    await expect(page.locator(".navigation-form-error")).toContainText(
      "Temporary menu save failure",
    );
    await expect(page.getByLabel("Menu label", { exact: true })).toHaveValue(
      "Our flowers",
    );
    await expect(page.getByLabel("Parent item", { exact: true })).toHaveValue(
      parent.id,
    );
    expect((await readMenu(page)).items).toHaveLength(3);
    await page.unroute("**/api/navigation");

    // The server saved the item, but the response was lost. Retrying must not duplicate it.
    let writes = 0;
    await page.route("**/api/navigation", async (route) => {
      if (route.request().method() !== "PUT") return route.continue();
      writes++;
      expect((await route.fetch()).ok()).toBeTruthy();
      await route.fulfill({
        status: 503,
        json: { error: "Response interrupted after saving" },
      });
    });
    await page
      .getByRole("button", { name: "Add menu item", exact: true })
      .click();
    await expect(page.locator(".navigation-form-error")).toContainText(
      "Response interrupted",
    );
    const created = (await readMenu(page)).items.find(
      (entry) => entry.label === "Our flowers",
    )!;
    expect(created.parentId).toBe(parent.id);
    await page
      .getByRole("button", { name: "Add menu item", exact: true })
      .click();
    await listReady(page);
    expect(writes).toBe(1);
    expect(
      (await readMenu(page)).items.filter((entry) => entry.id === created.id),
    ).toHaveLength(1);
    await page.unroute("**/api/navigation");

    await page
      .getByRole("link", { name: "Edit A garden", exact: true })
      .click();
    await expect(page).toHaveURL(`/admin/navigation/${parent.id}/edit`);
    await expect(page.getByLabel("Menu label", { exact: true })).toHaveValue(
      parent.label,
    );
    const parents = page
      .getByLabel("Parent item", { exact: true })
      .locator("option");
    await expect(parents).toHaveText(["Top level", other.label]);
    await page
      .getByLabel("Menu label", { exact: true })
      .fill("A greener garden");
    const latest = await readMenu(page);
    await saveMenu(
      page,
      latest.items.map((entry) =>
        entry.id === other.id
          ? { ...entry, label: "Changed in another tab" }
          : entry,
      ),
    );
    await page
      .getByRole("button", { name: "Update menu item", exact: true })
      .click();
    await listReady(page);
    await expect(
      page.getByRole("link", {
        name: "Edit Changed in another tab",
        exact: true,
      }),
    ).toBeVisible();

    await page
      .getByRole("link", { name: "Edit A greener garden", exact: true })
      .click();
    await page
      .getByLabel("Menu label", { exact: true })
      .fill("My retained input");
    const changed = (await readMenu(page)).items.map((entry) =>
      entry.id === parent.id ? { ...entry, label: "Saved elsewhere" } : entry,
    );
    await saveMenu(page, changed);
    await page
      .getByRole("button", { name: "Update menu item", exact: true })
      .click();
    await expect(page.locator(".navigation-form-error")).toContainText(
      "changed elsewhere",
    );
    await expect(page.getByLabel("Menu label", { exact: true })).toHaveValue(
      "My retained input",
    );
    expect((await readMenu(page)).items).toEqual(changed);
    await page
      .getByRole("button", { name: "Load saved values", exact: true })
      .click();
    await expect(page.getByLabel("Menu label", { exact: true })).toHaveValue(
      "Saved elsewhere",
    );
    await page.screenshot({
      path: testInfo.outputPath("navigation-edit.png"),
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    if (!isMobile)
      await expect(
        page.getByRole("link", { name: "Navigation", exact: true }),
      ).toHaveAttribute("aria-current", "page");
    await page.getByRole("link", { name: "Cancel", exact: true }).click();
    await listReady(page);
    await expect(
      page.getByRole("link", { name: "Edit Saved elsewhere", exact: true }),
    ).toBeVisible();
  } finally {
    await page.unrouteAll({ behavior: "ignoreErrors" });
    await saveMenu(page, original.items);
  }
});

test("menu removal confirms descendants, keeps pages and rows on failure, and reviews concurrent changes", async ({
  page,
}, testInfo) => {
  test.setTimeout(120000);
  await signIn(page);
  const original = await readMenu(page),
    parent = menuItem("Remove this menu"),
    child = menuItem("Child menu", parent.id),
    grandchild = menuItem("Grandchild menu", child.id),
    keep = menuItem("Keep this menu");
  const pageResponse = await page.request.post("/api/pages", {
    headers,
    data: { title: "Menu removal fixture " + Date.now() },
  });
  expect(pageResponse.ok()).toBeTruthy();
  const linked = await pageResponse.json();
  parent.destination = { kind: "page", pageId: linked.id };
  let release: (() => void) | undefined;
  try {
    await saveMenu(page, [parent, child, grandchild, keep]);
    await page.goto("/admin/navigation");
    const remove = page.getByRole("button", {
      name: "Remove Remove this menu",
      exact: true,
    });
    const dialog = page.getByRole("dialog", {
      name: "Remove menu item?",
      exact: true,
    });
    let writes = 0;
    page.on("request", (request) => {
      if (
        new URL(request.url()).pathname === "/api/navigation" &&
        request.method() === "PUT"
      )
        writes++;
    });
    await remove.click();
    await expect(dialog).toContainText(
      "2 nested menu items will also be removed.",
    );
    await expect(
      dialog.getByRole("button", { name: "Cancel", exact: true }),
    ).toBeFocused();
    await page.screenshot({
      path: testInfo.outputPath("navigation-confirm-removal.png"),
      fullPage: true,
    });
    const box = (await dialog.boundingBox())!,
      viewport = await page.evaluate(() => ({
        width: document.documentElement.clientWidth,
        height: innerHeight,
      }));
    // Desktop reserves a scrollbar gutter while the modal locks page scrolling.
    expect(Math.abs(box.x + box.width / 2 - viewport.width / 2)).toBeLessThan(
      10,
    );
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.width).toBeLessThanOrEqual(viewport.width);
    await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(remove).toBeFocused();
    await remove.click();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    expect(writes).toBe(0);

    await remove.click();
    await page.route("**/api/navigation", async (route) => {
      if (route.request().method() !== "PUT") return route.continue();
      await route.fulfill({
        status: 503,
        json: { error: "Cannot remove yet" },
      });
    });
    await dialog
      .getByRole("button", { name: "Remove menu item", exact: true })
      .click();
    await expect(dialog.getByRole("alert")).toContainText("Cannot remove yet");
    expect((await readMenu(page)).items).toHaveLength(4);
    await expect(page.locator("[data-menu-item]")).toHaveCount(4);
    await page.unroute("**/api/navigation");
    // A new descendant added elsewhere must not be deleted without review.
    const extra = menuItem("New child elsewhere", parent.id);
    await saveMenu(page, [...(await readMenu(page)).items, extra]);
    await dialog
      .getByRole("button", { name: "Try removing again", exact: true })
      .click();
    await expect(dialog.getByRole("alert")).toContainText("changed elsewhere");
    await dialog
      .getByRole("button", { name: "Review saved menu", exact: true })
      .click();
    await expect(dialog).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: "Edit New child elsewhere", exact: true }),
    ).toBeVisible();
    expect((await readMenu(page)).items).toHaveLength(5);

    await remove.click();
    await expect(dialog).toContainText(
      "3 nested menu items will also be removed.",
    );
    await page.route("**/api/navigation", async (route) => {
      if (route.request().method() !== "PUT") return route.continue();
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      await route.continue();
    });
    const before = writes;
    await dialog
      .getByRole("button", { name: "Remove menu item", exact: true })
      .click();
    await expect(dialog).toHaveAttribute("aria-busy", "true");
    await expect(
      dialog.getByRole("button", { name: "Cancel", exact: true }),
    ).toBeDisabled();
    await expect(
      dialog.getByRole("button", { name: "Working…", exact: true }),
    ).toBeDisabled();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeVisible();
    expect(writes).toBe(before + 1);
    release!();
    await expect(dialog).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "Your menu", exact: true }),
    ).toBeFocused();
    expect((await readMenu(page)).items).toEqual([keep]);
    expect(
      (await page.request.get("/api/pages/" + linked.id)).ok(),
    ).toBeTruthy();
    await expect(
      page.getByRole("link", { name: "Edit Keep this menu", exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath("navigation-list.png"),
      fullPage: true,
    });
  } finally {
    release?.();
    await page.unrouteAll({ behavior: "ignoreErrors" });
    await saveMenu(page, original.items);
    const current = await (
      await page.request.get("/api/pages/" + linked.id)
    ).json();
    await page.request.delete("/api/pages/" + linked.id, {
      headers,
      data: { version: current.version },
    });
  }
});

test("new and edit menu routes require sign-in and missing menu items show not found", async ({
  page,
  browser,
  baseURL,
}) => {
  const id = crypto.randomUUID();
  const visitor = await browser.newContext();
  try {
    for (const path of [
      "/admin/navigation",
      "/admin/navigation/new",
      `/admin/navigation/${id}/edit`,
    ]) {
      const response = await visitor.request.get(baseURL + path, {
        maxRedirects: 0,
      });
      expect(response.status()).toBe(307);
      expect(response.headers().location).toContain("/login");
    }
  } finally {
    await visitor.close();
  }
  await signIn(page);
  await page.goto(`/admin/navigation/${id}/edit`);
  await expect(
    page.getByRole("heading", { name: "Page not found", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Menu label", { exact: true })).toHaveCount(0);
});
