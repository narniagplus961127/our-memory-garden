import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
const env = parseEnv(readFileSync(".env.test", "utf8"));
const headers = {
  Origin: process.env.PLAYWRIGHT_BASE_URL ?? env.NEXT_PUBLIC_APP_URL!,
};
async function login(page: Page) {
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

test("category and template searches retain hierarchy, manual order and the chosen import source", async ({
  page,
}, info) => {
  test.setTimeout(150000);
  await login(page);
  const suffix = crypto.randomUUID().slice(0, 8);
  async function create(path: string, data: object) {
    const response = await page.request.post(path, { headers, data });
    expect(response.status()).toBe(201);
    return response.json();
  }
  const parent = await create("/api/categories", {
    name: "Locations " + suffix,
  });
  const child = await create("/api/categories", {
    name: "Penang " + suffix,
    parentId: parent.id,
  });
  const other = await create("/api/categories", {
    name: "Birthdays " + suffix,
  });
  const rose = await create("/api/templates", { name: "Rose " + suffix });
  const cloud = await create("/api/templates", { name: "Cloud " + suffix });
  let reorders = 0;
  page.on("request", (request) => {
    if (
      request.method() === "PUT" &&
      request.url().includes("/api/admin-list-order")
    )
      reorders++;
  });
  await page.goto("/admin/categories", { waitUntil: "domcontentloaded" });
  const categoryLinks = page.locator(".category-list .admin-list-edit");
  const categoryOrder = await categoryLinks.allTextContents();
  await page
    .getByRole("searchbox", { name: "Search categories" })
    .fill("PENANG " + suffix);
  await expect(
    page.getByRole("link", { name: "Edit " + child.name, exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Edit " + parent.name, exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Edit " + other.name, exact: true }),
  ).toHaveCount(0);
  const grip = page.getByRole("button", {
    name: "Drag " + child.name,
    exact: true,
  });
  await expect(grip).toHaveAttribute("aria-disabled", "true");
  await grip.press("Space");
  await grip.press("ArrowUp");
  await grip.press("Enter");
  await page
    .getByRole("searchbox", { name: "Search categories" })
    .fill("no-matches-" + suffix);
  await expect(
    page.getByRole("status").filter({ hasText: "No categories match" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear search", exact: true }).click();
  expect(await categoryLinks.allTextContents()).toEqual(categoryOrder);
  await page.goto("/admin/templates", { waitUntil: "domcontentloaded" });
  const templateLinks = page.locator(".admin-list-edit");
  const templateOrder = await templateLinks.allTextContents();
  await page
    .getByRole("searchbox", { name: "Search templates" })
    .fill("ROSE " + suffix);
  await expect(
    page.getByRole("link", { name: "Edit " + rose.name, exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Edit " + cloud.name, exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Drag " + rose.name, exact: true }),
  ).toHaveAttribute("aria-disabled", "true");
  await page.getByRole("button", { name: "Clear search", exact: true }).click();
  expect(await templateLinks.allTextContents()).toEqual(templateOrder);
  expect(reorders).toBe(0);
  const source = await create("/api/pages", {
    title: "Search destination " + suffix,
  });
  await page.goto("/admin/pages/" + source.id, {
    waitUntil: "domcontentloaded",
  });
  await page.getByRole("button", { name: "Page actions" }).click();
  await page.getByRole("menuitem", { name: "Import page content" }).click();
  const dialog = page.getByRole("dialog", { name: "Import page content" });
  await dialog.getByRole("tab", { name: "Use template content" }).click();
  await dialog
    .getByRole("searchbox", { name: "Search source templates" })
    .fill("ROSE " + suffix);
  const picker = dialog.getByLabel("Source template", { exact: true });
  await expect(picker.locator(`option[value="${cloud.id}"]`)).toHaveCount(0);
  await picker.selectOption(rose.id);
  await expect(
    dialog.getByRole("button", { name: "Replace page content" }),
  ).toBeEnabled();
  await dialog
    .getByRole("searchbox", { name: "Search source templates" })
    .fill("no-matches-" + suffix);
  await expect(picker).toHaveValue(rose.id);
  await expect(dialog).toContainText("Your selected template is kept");
  await page.screenshot({ path: info.outputPath("template-search.png") });
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  const after = await (
    await page.request.get("/api/pages/" + source.id)
  ).json();
  expect(after.content).toEqual(source.content);
});
