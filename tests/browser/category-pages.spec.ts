import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { selectBlock, canvasField } from "./editor-controls";
const env = Object.fromEntries(
  (await readFile(".env.test", "utf8"))
    .split(/\r?\n/)
    .filter((l) => l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
);
const headers = { Origin: env.NEXT_PUBLIC_APP_URL };
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
async function category(page: Page) {
  const key = crypto.randomUUID();
  const r = await page.request.post("/api/categories", {
    headers,
    data: { name: "Our category " + key, slug: "collection-" + key },
  });
  expect(r.status()).toBe(201);
  return r.json();
}
test("category forms use dedicated pages, generate editable addresses and retain duplicate errors", async ({
  page,
}, info) => {
  await signIn(page);
  await page.goto("/admin/categories");
  await page
    .getByRole("link", { name: "Create category", exact: true })
    .click();
  await expect(page).toHaveURL(/\/admin\/categories\/new$/);
  const suffix = crypto.randomUUID().slice(0, 8),
    name = "Our Day " + suffix,
    address = page.getByLabel("Category address", { exact: true });
  await page.getByLabel("Category name", { exact: true }).fill(name);
  await expect(address).toHaveValue("our-day-" + suffix);
  await address.fill("our-events-" + suffix);
  await page
    .getByLabel("Category name", { exact: true })
    .fill("Our lovely day " + suffix);
  await expect(address).toHaveValue("our-events-" + suffix);
  await page.getByRole("button", { name: "Use name", exact: true }).click();
  await expect(address).toHaveValue("our-lovely-day-" + suffix);
  await page.screenshot({
    path: info.outputPath("category-create.png"),
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Create category", exact: true })
    .click();
  await expect(page).toHaveURL(/\/admin\/categories$/);
  const list = await (await page.request.get("/api/categories")).json(),
    created = list.find(
      (c: { name: string }) => c.name === "Our lovely day " + suffix,
    );
  await page
    .getByRole("link", { name: "Edit " + created.name, exact: true })
    .click();
  await expect(page).toHaveURL("/admin/categories/" + created.id + "/edit");
  await page
    .getByLabel("Category name", { exact: true })
    .fill("A renamed collection " + suffix);
  await expect(address).toHaveValue(created.slug);
  const other = await category(page);
  await address.fill(other.slug);
  await page
    .getByRole("button", { name: "Update category", exact: true })
    .click();
  await expect(
    page.getByRole("alert").filter({ hasText: "address is already in use" }),
  ).toContainText("address is already in use");
  await expect(address).toHaveValue(other.slug);
  await address.fill("our-events-" + suffix);
  await page.screenshot({
    path: info.outputPath("category-edit.png"),
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Update category", exact: true })
    .click();
  await expect(page).toHaveURL(/\/admin\/categories$/);
  const edit = page.getByRole("link", {
      name: "Edit A renamed collection " + suffix,
      exact: true,
    }),
    remove = page.getByRole("button", {
      name: "Delete A renamed collection " + suffix,
      exact: true,
    });
  await expect(edit).toBeVisible();
  await expect(remove).toBeVisible();
  expect((await remove.boundingBox())!.width).toBeGreaterThanOrEqual(44);
  await page.screenshot({
    path: info.outputPath("category-list.png"),
    fullPage: true,
  });
  expect((await page.request.get("/category/" + created.slug)).status()).toBe(
    404,
  );
  const stable = await page.request.get("/c/" + created.id, {
    maxRedirects: 0,
  });
  expect(stable.headers().location).toBe("/category/our-events-" + suffix);
  await edit.click();
  await page.getByLabel("Category name", { exact: true }).fill("Not saved");
  await page.getByRole("link", { name: "Cancel", exact: true }).click();
  await expect(edit).toBeVisible();
});
test("category removal confirms, retains failures, blocks busy dismissal and keeps its pages", async ({
  page,
}, info) => {
  await signIn(page);
  const c = await category(page);
  const created = await (
    await page.request.post("/api/pages", {
      headers,
      data: { title: "Kept category page " + Date.now() },
    })
  ).json();
  expect(
    (
      await page.request.patch("/api/pages/" + created.id + "/details", {
        headers,
        data: {
          date: null,
          categoryId: c.id,
          coverPhotoId: null,
          metadataVersion: 0,
        },
      })
    ).ok(),
  ).toBeTruthy();
  await page.goto("/admin/categories");
  const remove = page.getByRole("button", {
    name: "Delete " + c.name,
    exact: true,
  });
  await remove.click();
  const dialog = page.getByRole("dialog", {
    name: "Delete " + c.name + "?",
    exact: true,
  });
  await expect(dialog).toContainText("pages and photos will be kept");
  await expect(
    dialog.getByRole("button", { name: "Cancel", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(remove).toBeFocused();
  let release = () => {},
    started = () => {};
  const held = new Promise<void>((r) => (release = r)),
    arrived = new Promise<void>((r) => (started = r));
  await page.route("**/api/categories/" + c.id, async (route) => {
    if (route.request().method() !== "DELETE") return route.continue();
    started();
    await held;
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        error: "Category removal interrupted. Your pages are safe.",
      }),
    });
  });
  try {
    await remove.click();
    await dialog
      .getByRole("button", { name: "Delete category", exact: true })
      .click();
    await arrived;
    await page.keyboard.press("Escape");
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole("button", { name: "Cancel", exact: true }),
    ).toBeDisabled();
  } finally {
    release();
  }
  await expect(dialog.getByRole("alert")).toContainText("removal interrupted");
  await page.screenshot({ path: info.outputPath("category-delete.png") });
  await page.unrouteAll({ behavior: "wait" });
  await dialog
    .getByRole("button", { name: "Retry deletion", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  await expect(remove).toHaveCount(0);
  await expect(
    page.getByRole("status").filter({ hasText: "Category deleted" }),
  ).toBeVisible();
  const remaining = await (
    await page.request.get("/api/pages/" + created.id)
  ).json();
  expect(remaining.title).toBe(created.title);
  expect(remaining.category_id).toBeNull();
});
test("category destinations work in menus, inline text and buttons while public archives hide private pages", async ({
  page,
  browser,
  baseURL,
  isMobile,
}, info) => {
  test.setTimeout(120000);
  await signIn(page);
  const c = await category(page);
  async function assigned(title: string, visibility: string) {
    let p = await (
      await page.request.post("/api/pages", { headers, data: { title } })
    ).json();
    p = await (
      await page.request.patch("/api/pages/" + p.id + "/details", {
        headers,
        data: {
          date: null,
          categoryId: c.id,
          coverPhotoId: null,
          metadataVersion: 0,
        },
      })
    ).json();
    if (visibility === "public")
      p = await (
        await page.request.patch("/api/pages/" + p.id, {
          headers,
          data: { version: p.version, visibility },
        })
      ).json();
    return p;
  }
  const visible = await assigned("Public memory " + Date.now(), "public"),
    privatePage = await assigned("Private memory " + Date.now(), "private");
  await page.goto("/admin/navigation/new");
  await page
    .getByLabel("Menu label", { exact: true })
    .fill("Collection " + c.id);
  await page
    .getByLabel("Destination type", { exact: true })
    .selectOption("category");
  await page.getByLabel("Category", { exact: true }).selectOption(c.id);
  await page
    .getByRole("button", { name: "Add menu item", exact: true })
    .click();
  await expect(page).toHaveURL(/\/admin\/navigation$/);
  let source = await (
    await page.request.post("/api/pages", {
      headers,
      data: { title: "Category editor " + Date.now() },
    })
  ).json();
  const content = {
    root: { props: {} },
    content: [
      {
        type: "Section",
        props: {
          id: "category-link-section",
          content: [
            {
              type: "Text",
              props: {
                id: "category-link-text",
                text: "Browse collection",
                style: "p",
              },
            },
            {
              type: "Button",
              props: {
                id: "category-link-button",
                label: "Visit collection",
                href: "",
              },
            },
          ],
        },
      },
    ],
  };
  source = await (
    await page.request.patch("/api/pages/" + source.id, {
      headers,
      data: { version: source.version, visibility: "public", content },
    })
  ).json();
  await page.goto("/admin/pages/" + source.id);
  await selectBlock(page, "Select Button 1");
  await page
    .getByRole("button", { name: "Open settings panel", exact: true })
    .click();
  await page
    .getByLabel("Destination type", { exact: true })
    .selectOption("category");
  await expect(
    page.getByRole("status", { name: "Auto-save status" }),
  ).toHaveText("Saved");
  await page.getByLabel("Category", { exact: true }).selectOption(c.id);
  await expect(
    page.getByRole("status", { name: "Auto-save status" }),
  ).toHaveText("Saved");
  await selectBlock(page, "Select Text 1");
  const close = page.getByRole("button", { name: "Close panel", exact: true });
  if (isMobile && (await close.isVisible())) await close.click();
  const field = canvasField(page, "Text content");
  await field.evaluate((element) => {
    const range = element.ownerDocument.createRange();
    range.selectNodeContents(element.querySelector("p")!);
    (element as HTMLElement).focus();
    const selection = element.ownerDocument.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
  });
  await page.getByRole("button", { name: "Add a link", exact: true }).click();
  const dialog = page.getByRole("dialog", {
    name: "Link text to a page or website",
  });
  await dialog
    .getByLabel("Destination type", { exact: true })
    .selectOption("category");
  await dialog.getByLabel("Category", { exact: true }).selectOption(c.id);
  await dialog.getByRole("button", { name: "Apply link", exact: true }).click();
  await expect(
    page.getByRole("status", { name: "Auto-save status" }),
  ).toHaveText("Saved");
  const visitor = await browser.newContext();
  try {
    const pub = await visitor.newPage();
    await pub.goto(baseURL + "/garden/" + source.slug);
    for (const name of ["Browse collection", "Visit collection"])
      await expect(
        pub.getByRole("link", { name, exact: true }),
      ).toHaveAttribute("href", "/c/" + c.id);
    await pub
      .getByRole("link", { name: "Visit collection", exact: true })
      .click();
    await expect(pub).toHaveURL("/category/" + c.slug);
    await expect(
      pub.getByRole("heading", { name: c.name, exact: true }),
    ).toBeVisible();
    await expect(
      pub.getByRole("link", { name: visible.title, exact: true }),
    ).toBeVisible();
    await expect(pub.getByText(privatePage.title, { exact: true })).toHaveCount(
      0,
    );
    await pub
      .getByRole("button", { name: "Open website menu", exact: true })
      .click();
    await expect(
      pub.getByRole("link", { name: "Collection " + c.id, exact: true }),
    ).toHaveAttribute("href", "/category/" + c.slug);
    await pub.screenshot({
      path: info.outputPath("category-public.png"),
      fullPage: true,
    });
  } finally {
    await visitor.close();
  }
});
