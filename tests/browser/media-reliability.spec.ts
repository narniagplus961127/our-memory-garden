import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import sharp from "sharp";
import {
  readMediaBrowse,
  defaultMediaBrowse,
} from "../../src/lib/media-browse";
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
async function photos(page: Page, count: number, prefix: string) {
  const bytes = await sharp({
    create: { width: 80, height: 60, channels: 3, background: "#769270" },
  })
    .png()
    .toBuffer();
  const items: { id: string; name: string }[] = [];
  for (let index = 0; index < count; index++) {
    const name = prefix + " " + index + ".png";
    const result = await page.request.post("/api/media/uploads", {
      headers,
      data: { name, size: bytes.length, type: "image/png" },
    });
    expect(result.status()).toBe(201);
    const upload = await result.json();
    expect(
      (
        await page.request.put(upload.uploadUrl, {
          headers: { "Content-Type": "image/png" },
          data: bytes,
        })
      ).ok(),
    ).toBeTruthy();
    expect(
      (
        await page.request.post(`/api/media/${upload.id}/complete`, {
          headers,
          data: {},
        })
      ).ok(),
    ).toBeTruthy();
    items.push({ id: upload.id, name });
  }
  return items;
}
test("browse records reject malformed, expired and oversized preferences", () => {
  const saved = {
    ...defaultMediaBrowse,
    version: 1,
    savedAt: Date.now(),
    batches: 3,
    scrollY: 900,
  };
  expect(readMediaBrowse(JSON.stringify(saved))?.batches).toBe(3);
  for (const value of [
    null,
    "{",
    JSON.stringify({ ...saved, batches: 51 }),
    JSON.stringify({ ...saved, filters: { usage: "all" } }),
    JSON.stringify({ ...saved, savedAt: Date.now() - 13 * 3600_000 }),
    JSON.stringify({ ...saved, scrollY: -1 }),
  ])
    expect(readMediaBrowse(value)).toBeNull();
});

test("failed photos offer an explicit retry and metadata-only checks respect privacy", async ({
  page,
}) => {
  test.setTimeout(120000);
  await login(page);
  const [photo] = await photos(
    page,
    1,
    "Photo retry " + crypto.randomUUID().slice(0, 8),
  );
  let fail = true,
    missing = false;
  const gets: string[] = [];
  await page.route(`**/api/media/${photo.id}/**`, async (route) => {
    const request = route.request();
    if (request.method() === "HEAD" && missing)
      return route.fulfill({ status: 404 });
    if (request.method() === "GET") {
      gets.push(request.url());
      if (fail)
        return route.fulfill({
          status: 503,
          contentType: "application/json",
          body: '{"error":"Temporarily unavailable"}',
        });
    }
    return route.continue();
  });
  const head = await page.request.head(`/api/media/${photo.id}/thumb-320`);
  expect(head.status()).toBe(200);
  expect((await head.body()).length).toBe(0);
  expect(head.headers()["content-type"]).toContain("image/webp");
  const denied = await fetch(
    headers.Origin + `/api/media/${photo.id}/thumb-320`,
    { method: "HEAD" },
  );
  expect(denied.status).toBe(404);
  expect(await denied.text()).toBe("");
  await page.goto("/admin/media");
  await page
    .getByRole("searchbox", { name: "Find a photo", exact: true })
    .fill(photo.name);
  await page
    .getByRole("button", { name: "Photo details " + photo.name, exact: true })
    .click();
  let dialog = page.getByRole("dialog", { name: "Photo details", exact: true });
  await expect(
    dialog.getByText("Couldn’t load this photo", { exact: true }),
  ).toBeVisible();
  await expect(
    dialog.getByText("Photo unavailable", { exact: true }),
  ).toHaveCount(0);
  fail = false;
  await dialog
    .getByRole("button", { name: "Retry photo", exact: true })
    .click();
  await expect
    .poll(() =>
      dialog
        .locator("img")
        .evaluate(
          (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
        ),
    )
    .toBeTruthy();
  expect(gets.some((url) => url.includes("retry=1"))).toBeTruthy();
  await dialog
    .getByRole("button", { name: "Close photo details", exact: true })
    .click();
  fail = true;
  missing = true;
  await page
    .getByRole("button", { name: "Photo details " + photo.name, exact: true })
    .click();
  dialog = page.getByRole("dialog", { name: "Photo details", exact: true });
  await expect(
    dialog.getByText("Photo unavailable", { exact: true }),
  ).toBeVisible();
  await expect(
    dialog.getByText("It may have been removed or access has changed.", {
      exact: true,
    }),
  ).toBeVisible();
  fail = false;
  missing = false;
  await dialog
    .getByRole("button", { name: "Retry photo", exact: true })
    .click();
  await expect
    .poll(() =>
      dialog
        .locator("img")
        .evaluate(
          (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
        ),
    )
    .toBeTruthy();
});

test("media browsing resumes and hidden selections can be reviewed without deleting photos", async ({
  page,
  isMobile,
}) => {
  test.setTimeout(120000);
  await login(page);
  const prefix = "Remember media " + crypto.randomUUID().slice(0, 8);
  const items = await photos(page, 6, prefix);
  const deletes: string[] = [];
  await page.route("**/api/media/*", (route) => {
    if (route.request().method() === "DELETE")
      deletes.push(route.request().url());
    return route.continue();
  });
  await page.goto("/admin/media");
  const search = page.getByRole("searchbox", {
    name: "Find a photo",
    exact: true,
  });
  await search.fill(prefix);
  await expect(page.locator(".media-card")).toHaveCount(6);
  const choices = page.getByRole("button", {
    name: /^Toggle selection for Remember media/,
  });
  await choices.first().click();
  await choices.last().click({ modifiers: ["Shift"] });
  await search.fill(items[0].name);
  await expect(page.locator(".media-card")).toHaveCount(1);
  await expect(
    page.getByRole("region", { name: "Selected photos", exact: true }),
  ).toContainText("5 not shown");
  await page
    .getByRole("button", { name: "Review selection", exact: true })
    .click();
  const review = page.getByRole("dialog", {
    name: "Review selected photos",
    exact: true,
  });
  await expect(
    review.getByText("Not shown in current results", { exact: true }),
  ).toHaveCount(5);
  await review
    .getByRole("button", {
      name: "Remove selection for " + items[1].name,
      exact: true,
    })
    .click();
  await expect(review.getByRole("status")).toContainText(
    "5 selected · 4 not shown",
  );
  await review
    .getByRole("button", { name: "Remove hidden selections", exact: true })
    .click();
  await expect(review.getByRole("status")).toContainText(
    "1 selected · 0 not shown",
  );
  expect(deletes).toEqual([]);
  await review
    .getByRole("button", { name: "Close review", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Clear selection", exact: true })
    .click();
  await search.fill(prefix);
  await expect(page.locator(".media-card")).toHaveCount(6);
  await page.getByRole("button", { name: "Filters", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Group photos", exact: true })
    .selectOption("month");
  // Exercise progressive restoration with small batches of real authorized
  // records. The API's ordinary cursor format still drives subsequent reads.
  await page.route("**/api/media?**", async (route) => {
    if (new URL(route.request().url()).searchParams.get("search") !== prefix)
      return route.continue();
    const response = await route.fetch();
    const data = await response.json();
    if (!response.ok() || data.photos.length <= 2)
      return route.fulfill({ response });
    const batch = data.photos.slice(0, 2),
      last = batch.at(-1);
    await route.fulfill({
      response,
      json: {
        photos: batch,
        nextCursor:
          new Date(last.uploadedAt).toISOString().slice(0, -1) +
          "000Z/" +
          last.id,
      },
    });
  });
  await page
    .getByRole("button", { name: "Refresh library", exact: true })
    .click();
  await expect(page.locator(".media-card")).toHaveCount(2);
  await page
    .getByRole("button", { name: "Show more library photos", exact: true })
    .click();
  await expect(page.locator(".media-card")).toHaveCount(4);
  await page
    .getByRole("button", { name: "Show more library photos", exact: true })
    .click();
  await expect(page.locator(".media-card")).toHaveCount(6);
  await page.locator(".media-card").last().scrollIntoViewIfNeeded();
  const position = await page.evaluate(() => window.scrollY);
  expect(position).toBeGreaterThan(50);
  await expect
    .poll(() =>
      page.evaluate(() => {
        const key = Object.keys(sessionStorage).find((key) =>
          key.startsWith("garden-media-browse:"),
        );
        return key ? JSON.parse(sessionStorage.getItem(key)!).scrollY : 0;
      }),
    )
    .toBeGreaterThan(position - 10);
  await page.goto("/admin/pages");
  await page.goto("/admin/media");
  await expect(search).toHaveValue(prefix);
  await expect(
    page.getByRole("combobox", { name: "Group photos", exact: true }),
  ).toHaveValue("month");
  await expect(page.locator(".media-card")).toHaveCount(6);
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeGreaterThan(position - 100);
  await expect(
    page.getByRole("region", { name: "Selected photos", exact: true }),
  ).toHaveCount(0);
  await page.screenshot({
    path: test.info().outputPath("media-restored-browse.png"),
    fullPage: false,
  });
  // Sign-out invalidation must prevent a later unmount from recreating preferences.
  await page.evaluate(() => {
    const key = Object.keys(sessionStorage).find((key) =>
      key.startsWith("garden-media-browse:"),
    );
    const account = decodeURIComponent(
      key!.slice("garden-media-browse:".length),
    );
    window.dispatchEvent(
      new CustomEvent("garden-signout", { detail: account }),
    );
  });
  await page.goto("/admin/pages");
  expect(
    await page.evaluate(() =>
      Object.keys(sessionStorage).filter((key) =>
        key.startsWith("garden-media-browse:"),
      ),
    ),
  ).toEqual([]);
});

test("library browsing works when tab storage is unavailable", async ({
  page,
}) => {
  await login(page);
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new Error("Storage unavailable");
    };
    Storage.prototype.setItem = () => {
      throw new Error("Storage unavailable");
    };
  });
  await page.goto("/admin/media");
  await page
    .getByRole("searchbox", { name: "Find a photo", exact: true })
    .fill("No results " + crypto.randomUUID());
  await expect(
    page.getByRole("heading", { name: "No matching photos", exact: true }),
  ).toBeVisible();
});

test("page-title navigation waits for pending search results and stays in the editor", async ({
  page,
}) => {
  test.setTimeout(120000);
  await login(page);
  const title = "Title navigation " + crypto.randomUUID().slice(0, 8);
  const created = await (
    await page.request.post("/api/pages", { headers, data: { title } })
  ).json();
  expect(
    (
      await page.request.patch(`/api/pages/${created.id}/details`, {
        headers,
        data: {
          date: "2099-01-01",
          categoryIds: [],
          coverPhotoId: null,
          metadataVersion: created.metadata_version,
        },
      })
    ).ok(),
  ).toBeTruthy();
  await page.goto("/admin/pages");
  const link = page.getByRole("link", { name: "Edit " + title, exact: true });
  await expect(link).toBeVisible();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/admin/pages?**", async (route) => {
    if (new URL(route.request().url()).searchParams.get("q") === title)
      await gate;
    await route.continue();
  });
  try {
    await page
      .getByRole("searchbox", { name: "Search pages", exact: true })
      .fill(title);
    await expect(link).toHaveAttribute("aria-disabled", "true");
    await link.press("Enter");
    expect(new URL(page.url()).pathname).toBe("/admin/pages");
  } finally {
    release();
  }
  await expect(link).not.toHaveAttribute("aria-disabled", "true");
  await link.click();
  await expect(
    page.getByRole("button", { name: "Page actions", exact: true }),
  ).toBeVisible({ timeout: 45000 });
  await expect(page).toHaveURL(new RegExp(`/admin/pages/${created.id}$`));
});
