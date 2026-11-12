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

test("Pages and Categories share row actions and save keyboard drag order", async ({
  page,
}) => {
  test.setTimeout(120000);
  await signIn(page);
  const suffix = crypto.randomUUID().slice(0, 8);
  for (const list of ["pages", "categories"]) {
    const first = "Apple " + suffix;
    const second = "Zinnia " + suffix;
    // Both fallback orders put Apple ahead of Zinnia.
    for (const name of [second, first]) {
      const created = await page.request.post("/api/" + list, {
        headers,
        data: list === "pages" ? { title: name } : { name },
      });
      expect(created.status()).toBe(201);
    }
    await page.goto("/admin/" + list);
    const titles = page
      .locator(".admin-list-row strong")
      .filter({ hasText: suffix });
    await expect(titles).toHaveText([first, second]);
    const handle = page.getByRole("button", {
      name: "Drag " + second,
      exact: true,
    });
    const row = page.locator(".admin-list-row").filter({ has: handle });
    await expect(
      row.getByRole("link", { name: "Edit " + second }),
    ).toBeVisible();
    await expect(
      row.getByRole("button", {
        name:
          list === "pages"
            ? "Move " + second + " to trash"
            : "Delete " + second,
      }),
    ).toHaveCSS("width", "44px");
    await handle.press("Space");
    await handle.press("ArrowUp");
    await handle.press("Escape");
    await expect(titles).toHaveText([first, second]);
    await handle.press("Space");
    await handle.press("Home");
    const responsePromise = page.waitForResponse((response) =>
      response.url().endsWith("/api/admin-list-order"),
    );
    await handle.press("Enter");
    const response = await responsePromise;
    expect(response.ok()).toBeTruthy();
    await expect(titles).toHaveText([second, first]);
    await expect(handle).toBeFocused();
    const { ids, version } = await response.json();
    const stale = await page.request.put("/api/admin-list-order", {
      headers,
      data: { list, ids: [...ids].reverse(), version: version - 1 },
    });
    expect(stale.status()).toBe(409);
    await page.reload();
    await expect(titles).toHaveText([second, first]);
  }
});

test("new page URL follows its title until edited and rejects duplicates without creating a page", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/admin/pages/new");
  const title = page.getByLabel("Page title", { exact: true }),
    url = page.getByLabel("Page URL", { exact: true });
  await title.fill("Our Day");
  await expect(url).toHaveValue("our-day");
  await title.fill("Our Happy Day!");
  await expect(url).toHaveValue("our-happy-day");
  const unique = "our-day-" + crypto.randomUUID();
  await url.fill(unique);
  await title.fill("A different title");
  await expect(url).toHaveValue(unique);
  await page.getByRole("button", { name: "Use title", exact: true }).click();
  await expect(url).toHaveValue("a-different-title");
  await title.fill("Café & Flowers");
  await expect(url).toHaveValue("cafe-flowers");
  await url.fill(unique);
  await page
    .getByRole("button", { name: "Create private page", exact: true })
    .click();
  await expect(page).toHaveURL(/\/admin\/pages\/[0-9a-f-]{36}$/);
  const created = await (
    await page.request.get("/api/pages/" + page.url().split("/").pop())
  ).json();
  expect(created.slug).toBe(unique);
  expect(created.visibility).toBe("private");
  await page.goto("/admin/pages/new");
  await title.fill("Keep this title");
  await url.fill(unique);
  await page
    .getByRole("button", { name: "Create private page", exact: true })
    .click();
  await expect(page.locator(".new-page-form").getByRole("alert")).toContainText(
    "already in use",
  );
  await expect(url).toHaveAttribute("aria-invalid", "true");
  await expect(title).toHaveValue("Keep this title");
  await expect(page).toHaveURL(/\/admin\/pages\/new$/);
  const pages = await (await page.request.get("/api/pages")).json();
  expect(
    pages.filter((item: { slug: string }) => item.slug === unique),
  ).toHaveLength(1);
  await url.fill(unique + "-second");
  await page
    .getByRole("button", { name: "Create private page", exact: true })
    .click();
  await expect(page).toHaveURL(/\/admin\/pages\/[0-9a-f-]{36}$/);
  const savedPath = new URL(page.url()).pathname;
  await page.goto("/admin/pages");
  await expect(
    page.getByRole("link", { name: "History and recovery", exact: true }),
  ).toHaveCount(0);
  await page.locator('.admin-page-cards a[href="' + savedPath + '"]').click();
  await page.getByRole("button", { name: "Page actions", exact: true }).click();
  await expect(
    page.getByRole("menuitem", { name: "History", exact: true }),
  ).toBeVisible();
});

test("Categories navigation supports creating, renaming and duplicate-name recovery", async ({
  page,
  isMobile,
}) => {
  await signIn(page);
  await page.goto("/admin/pages");
  if (isMobile)
    await page.getByLabel("Open administration menu", { exact: true }).click();
  await page
    .getByRole("link", { name: "Categories", exact: true })
    .filter({ visible: true })
    .click();
  await expect(page).toHaveURL(/\/admin\/categories$/);
  const name = "Adventures " + crypto.randomUUID(),
    renamed = name + " together";
  await page
    .getByRole("link", { name: "Create category", exact: true })
    .click();
  await expect(page).toHaveURL(/\/admin\/categories\/new$/);
  await page.getByLabel("Category name", { exact: true }).fill(name);
  await page
    .getByRole("button", { name: "Create category", exact: true })
    .click();
  await expect(page).toHaveURL(/\/admin\/categories$/);
  const list = await (await page.request.get("/api/categories")).json();
  const category = list.find((item: { name: string }) => item.name === name);
  const created = await (
    await page.request.post("/api/pages", {
      headers,
      data: { title: "Category reference" },
    })
  ).json();
  expect(
    (
      await page.request.patch("/api/pages/" + created.id + "/details", {
        headers,
        data: {
          date: null,
          categoryId: category.id,
          coverPhotoId: null,
          metadataVersion: 0,
        },
      })
    ).ok(),
  ).toBeTruthy();
  await page.getByRole("link", { name: "Edit " + name, exact: true }).click();
  await page
    .getByRole("textbox", { name: "Category name", exact: true })
    .fill(renamed);
  await page
    .getByRole("button", { name: "Update category", exact: true })
    .click();
  await expect(page).toHaveURL(/\/admin\/categories$/);
  const after = await (
    await page.request.get("/api/pages/" + created.id)
  ).json();
  expect(after.category_id).toBe(category.id);
  await page
    .getByRole("link", { name: "Create category", exact: true })
    .click();
  await page
    .getByLabel("Category name", { exact: true })
    .fill(renamed.toUpperCase());
  await page
    .getByRole("button", { name: "Create category", exact: true })
    .click();
  await expect(
    page.getByRole("alert").filter({ hasText: "already uses this name" }),
  ).toContainText("already uses this name");
  await expect(page.getByLabel("Category name", { exact: true })).toHaveValue(
    renamed.toUpperCase(),
  );
  await page.getByRole("link", { name: "Cancel", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Edit " + renamed, exact: true }),
  ).toBeVisible();
  await page.goto("/admin/pages/" + created.id);
  await page
    .getByRole("button", { name: "Page settings", exact: true })
    .click();
  await expect(page.getByLabel("Page category", { exact: true })).toHaveValue(
    category.id,
  );
  await expect(
    page.getByLabel("Page category", { exact: true }).locator("option:checked"),
  ).toHaveText(renamed);
});

test("creation validates URLs and atomically rejects concurrent duplicates", async ({
  page,
  browser,
}) => {
  await signIn(page);
  for (const slug of ["", "Bad URL", "two--hyphens", "x".repeat(101), null]) {
    const response = await page.request.post("/api/pages", {
      headers,
      data: { title: "Invalid address", slug },
    });
    expect(response.status()).toBe(400);
  }
  const slug = "atomic-" + crypto.randomUUID();
  const responses = await Promise.all(
    [1, 2].map((index) =>
      page.request.post("/api/pages", {
        headers,
        data: { title: "Concurrent address " + index, slug },
      }),
    ),
  );
  expect(responses.map((response) => response.status()).sort()).toEqual([
    201, 409,
  ]);
  const created = await responses
    .find((response) => response.status() === 201)!
    .json();
  expect(
    (
      await page.request.post("/api/pages/" + created.id + "/trash", {
        headers,
        data: { action: "trash", confirm: true, version: created.version },
      })
    ).ok(),
  ).toBeTruthy();
  expect(
    (
      await page.request.post("/api/pages", {
        headers,
        data: { title: "Reserved in trash", slug },
      })
    ).status(),
  ).toBe(409);
  const visitor = await browser.newContext();
  expect(
    (
      await visitor.request.post(env.NEXT_PUBLIC_APP_URL + "/api/pages", {
        headers,
        data: { title: "Unauthorized", slug: "unauthorized" },
      })
    ).status(),
  ).toBe(401);
  const response = await visitor.request.get(
    env.NEXT_PUBLIC_APP_URL + "/admin/categories",
    { maxRedirects: 0 },
  );
  expect(response.status()).toBe(307);
  expect(response.headers().location).toContain("/login");
  await visitor.close();
});
