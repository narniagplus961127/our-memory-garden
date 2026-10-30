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

test("failed and unfinished page details recover after refresh and clear after retry", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(env.TEST_ADMIN_EMAIL);
  await page
    .getByLabel("Password", { exact: true })
    .fill(env.TEST_ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/pages$/);
  const p = await (
    await page.request.post("/api/pages", {
      headers: { Origin: new URL(page.url()).origin },
      data: { title: "Details recovery " + Date.now() },
    })
  ).json();
  await page.goto("/admin/pages/" + p.id);
  await page.route("**/api/pages/" + p.id + "/details", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "The connection is unavailable." }),
    }),
  );
  await page.getByRole("button", { name: "Page details", exact: true }).click();
  await page.getByLabel("Page date", { exact: true }).fill("2026-10-29");
  await expect(
    page.getByRole("status", { name: "Page details status" }),
  ).toHaveText("Unsaved · Retry");
  await page.reload();
  await page.getByRole("button", { name: "Page details", exact: true }).click();
  await expect(page.getByLabel("Page date", { exact: true })).toHaveValue(
    "2026-10-29",
  );
  await expect(
    page.getByRole("status", { name: "Page details status" }),
  ).toHaveText("Recovered · unsaved");
  await page.unroute("**/api/pages/" + p.id + "/details");
  await page
    .getByRole("button", { name: "Retry details", exact: true })
    .click();
  await expect(
    page.getByRole("status", { name: "Page details status" }),
  ).toHaveText("Saved");
  await expect
    .poll(() =>
      page.evaluate(
        (id) =>
          Object.keys(localStorage).filter((k) => k.includes(id + ":details"))
            .length,
        p.id,
      ),
    )
    .toBe(0);
  // Refresh before the debounce expires: recovery must already hold the edit.
  await page.getByLabel("Page date", { exact: true }).fill("2026-10-28");
  await page.reload();
  await page.getByRole("button", { name: "Page details", exact: true }).click();
  await expect(page.getByLabel("Page date", { exact: true })).toHaveValue(
    "2026-10-28",
  );
  await expect(
    page.getByRole("status", { name: "Page details status" }),
  ).toHaveText("Recovered · unsaved");
  await page
    .getByRole("button", { name: "Retry details", exact: true })
    .click();
  await expect(
    page.getByRole("status", { name: "Page details status" }),
  ).toHaveText("Saved");
  await expect
    .poll(
      async () =>
        (await (await page.request.get("/api/pages/" + p.id)).json()).page_date,
    )
    .toBe("2026-10-28");
});

test("concurrent page details preserve independent changes and require a choice for the same date", async ({
  page,
  browser,
  baseURL,
}) => {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(env.TEST_ADMIN_EMAIL);
  await page
    .getByLabel("Password", { exact: true })
    .fill(env.TEST_ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/pages$/);
  const headers = { Origin: new URL(page.url()).origin };
  const p = await (
    await page.request.post("/api/pages", {
      headers,
      data: { title: "Concurrent details " + Date.now() },
    })
  ).json();
  const other = await browser.newContext();
  expect(
    (
      await other.request.post(baseURL + "/api/auth/sign-in/email", {
        headers,
        data: {
          email: env.TEST_OTHER_EMAIL,
          password: env.TEST_OTHER_PASSWORD,
        },
      })
    ).status(),
  ).toBe(200);
  const category = await (
    await other.request.post(baseURL + "/api/categories", {
      headers,
      data: { name: "Other gardener " + Date.now() },
    })
  ).json();
  await page.goto("/admin/pages/" + p.id);
  await page.getByRole("button", { name: "Page details", exact: true }).click();
  await page.getByLabel("Page date", { exact: true }).fill("2026-10-28");
  await expect(
    page.getByRole("status", { name: "Page details status" }),
  ).toHaveText("Saved");
  expect(
    (
      await other.request.patch(baseURL + "/api/pages/" + p.id + "/details", {
        headers,
        data: {
          date: "2026-10-29",
          categoryId: category.id,
          coverPhotoId: null,
          metadataVersion: 1,
        },
      })
    ).status(),
  ).toBe(200);
  await page.getByLabel("Page date", { exact: true }).fill("2026-10-30");
  await expect(
    page.getByRole("region", { name: "Page details conflict" }),
  ).toBeVisible();
  await expect(page.getByLabel("Page category", { exact: true })).toHaveValue(
    category.id,
  );
  await page
    .getByRole("button", { name: "Keep my details", exact: true })
    .click();
  await expect(
    page.getByRole("status", { name: "Page details status" }),
  ).toHaveText("Saved");
  let current = await (await page.request.get("/api/pages/" + p.id)).json();
  expect(current.page_date).toBe("2026-10-30");
  expect(current.category_id).toBe(category.id);
  expect(
    (
      await other.request.patch(baseURL + "/api/pages/" + p.id + "/details", {
        headers,
        data: {
          date: current.page_date,
          categoryId: null,
          coverPhotoId: null,
          metadataVersion: current.metadata_version,
        },
      })
    ).status(),
  ).toBe(200);
  await page.getByLabel("Page date", { exact: true }).fill("2026-10-27");
  await expect(
    page.getByRole("status", { name: "Page details status" }),
  ).toHaveText("Saved");
  current = await (await page.request.get("/api/pages/" + p.id)).json();
  expect(current.page_date).toBe("2026-10-27");
  expect(current.category_id).toBeNull();
  expect(
    (
      await other.request.patch(baseURL + "/api/pages/" + p.id + "/details", {
        headers,
        data: {
          date: "2026-10-26",
          categoryId: null,
          coverPhotoId: null,
          metadataVersion: current.metadata_version,
        },
      })
    ).status(),
  ).toBe(200);
  await page.getByLabel("Page date", { exact: true }).fill("2026-10-25");
  await expect(
    page.getByRole("region", { name: "Page details conflict" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Continue editing details", exact: true })
    .click();
  await expect(page.getByLabel("Page date", { exact: true })).toHaveValue(
    "2026-10-25",
  );
  await page
    .getByRole("button", { name: "Review details conflict", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Use saved details", exact: true })
    .click();
  await expect(page.getByLabel("Page date", { exact: true })).toHaveValue(
    "2026-10-26",
  );
  await expect(
    page.getByRole("status", { name: "Page details status" }),
  ).toHaveText("Saved");
  await expect
    .poll(() =>
      page.evaluate(
        (id) =>
          Object.keys(localStorage).filter((k) => k.includes(id + ":details"))
            .length,
        p.id,
      ),
    )
    .toBe(0);
  await other.close();
});
test("two tabs keep separate details recovery copies through refresh and acknowledgement", async ({
  page,
  context,
}) => {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(env.TEST_ADMIN_EMAIL);
  await page
    .getByLabel("Password", { exact: true })
    .fill(env.TEST_ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/pages$/);
  const p = await (
    await page.request.post("/api/pages", {
      headers: { Origin: new URL(page.url()).origin },
      data: { title: "Two details drafts " + Date.now() },
    })
  ).json();
  const second = await context.newPage();
  for (const [tab, date] of [
    [page, "2026-10-28"],
    [second, "2026-10-29"],
  ] as const) {
    await tab.goto("/admin/pages/" + p.id);
    await tab.route("**/api/pages/" + p.id + "/details", (route) =>
      route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "The connection is unavailable." }),
      }),
    );
    await tab
      .getByRole("button", { name: "Page details", exact: true })
      .click();
    await tab.getByLabel("Page date", { exact: true }).fill(date);
    await expect(
      tab.getByRole("status", { name: "Page details status" }),
    ).toHaveText("Unsaved · Retry");
  }
  await expect
    .poll(() =>
      page.evaluate(
        (id) =>
          Object.keys(localStorage).filter((k) => k.includes(id + ":details:"))
            .length,
        p.id,
      ),
    )
    .toBe(2);
  for (const [tab, date] of [
    [page, "2026-10-28"],
    [second, "2026-10-29"],
  ] as const) {
    await tab.reload();
    await tab
      .getByRole("button", { name: "Page details", exact: true })
      .click();
    await expect(tab.getByLabel("Page date", { exact: true })).toHaveValue(
      date,
    );
    await expect(
      tab.getByRole("status", { name: "Page details status" }),
    ).toHaveText("Recovered · unsaved");
  }
  await page.unroute("**/api/pages/" + p.id + "/details");
  await page
    .getByRole("button", { name: "Retry details", exact: true })
    .click();
  await expect(
    page.getByRole("status", { name: "Page details status" }),
  ).toHaveText("Saved");
  await second.reload();
  await second
    .getByRole("button", { name: "Page details", exact: true })
    .click();
  await expect(second.getByLabel("Page date", { exact: true })).toHaveValue(
    "2026-10-29",
  );
  await expect
    .poll(() =>
      page.evaluate(
        (id) =>
          Object.keys(localStorage).filter((k) => k.includes(id + ":details:"))
            .length,
        p.id,
      ),
    )
    .toBe(1);
  await second.unroute("**/api/pages/" + p.id + "/details");
  await second
    .getByRole("button", { name: "Retry details", exact: true })
    .click();
  await expect(
    second.getByRole("region", { name: "Page details conflict" }),
  ).toBeVisible();
  await second
    .getByRole("button", { name: "Keep my details", exact: true })
    .click();
  await expect(
    second.getByRole("status", { name: "Page details status" }),
  ).toHaveText("Saved");
  await expect
    .poll(() =>
      page.evaluate(
        (id) =>
          Object.keys(localStorage).filter((k) => k.includes(id + ":details:"))
            .length,
        p.id,
      ),
    )
    .toBe(0);
  await second.close();
});

test("sign-out clears pending details recovery before a late response can rewrite it", async ({
  page,
  context,
}) => {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(env.TEST_ADMIN_EMAIL);
  await page
    .getByLabel("Password", { exact: true })
    .fill(env.TEST_ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/pages$/);
  const p = await (
    await page.request.post("/api/pages", {
      headers: { Origin: new URL(page.url()).origin },
      data: { title: "Details sign out " + Date.now() },
    })
  ).json();
  await page.goto("/admin/pages/" + p.id);
  let release!: () => void, committed!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve)),
    started = new Promise<void>((resolve) => (committed = resolve));
  await page.route("**/api/pages/" + p.id + "/details", async (route) => {
    const response = await route.fetch();
    committed();
    await gate;
    try {
      await route.fulfill({ response });
    } catch {}
  });
  await page.getByRole("button", { name: "Page details", exact: true }).click();
  await page.getByLabel("Page date", { exact: true }).fill("2026-10-29");
  await started;
  const signout = await context.newPage();
  await signout.goto("/admin/pages");
  const menu = signout.getByRole("button", {
    name: "Open administration menu",
  });
  if (await menu.isVisible()) await menu.click();
  await signout.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(signout).toHaveURL(/\/login$/);
  release();
  await expect(page).toHaveURL(/\/login$/);
  expect(
    await signout.evaluate(() =>
      Object.keys(localStorage).filter((k) => k.startsWith("garden-recovery:")),
    ),
  ).toEqual([]);
  await signout.reload();
  expect(
    await signout.evaluate(() =>
      Object.keys(localStorage).filter((k) => k.startsWith("garden-recovery:")),
    ),
  ).toEqual([]);
});

test("page details autosave and categories can be created and renamed", async ({
  page,
}, testInfo) => {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(env.TEST_ADMIN_EMAIL);
  await page
    .getByLabel("Password", { exact: true })
    .fill(env.TEST_ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/pages$/);
  const p = await (
    await page.request.post("/api/pages", {
      headers: { Origin: new URL(page.url()).origin },
      data: { title: "Page details journey " + Date.now() },
    })
  ).json();
  const photoName = "Details cover " + Date.now() + ".jpg";
  const sharp = (await import("sharp")).default;
  const bytes = await sharp({
    create: { width: 80, height: 60, channels: 3, background: "#769270" },
  })
    .jpeg()
    .toBuffer();
  const upload = await (
    await page.request.post("/api/media/uploads", {
      headers: { Origin: new URL(page.url()).origin },
      data: { name: photoName, size: bytes.length, type: "image/jpeg" },
    })
  ).json();
  expect(new URL(upload.uploadUrl).hostname).toBe("127.0.0.1");
  expect(
    (
      await fetch(upload.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": "image/jpeg" },
        body: bytes,
      })
    ).status,
  ).toBe(200);
  expect(
    (
      await page.request.post("/api/media/" + upload.id + "/complete", {
        headers: { Origin: new URL(page.url()).origin },
        data: {},
      })
    ).status(),
  ).toBe(200);
  await page.goto("/admin/pages/" + p.id);
  await page.getByRole("button", { name: "Page details", exact: true }).click();
  await page.getByLabel("Page date", { exact: true }).fill("2026-10-30");
  await expect(
    page.getByRole("status", { name: "Page details status" }),
  ).toHaveText("Saved");
  const category = "Garden dates " + Date.now();
  await page.getByLabel("Category name", { exact: true }).fill(category);
  await page
    .getByRole("button", { name: "Create category", exact: true })
    .click();
  await expect(page.getByLabel("Page category", { exact: true })).toHaveValue(
    /.+/,
  );
  await expect(
    page.getByRole("status", { name: "Page details status" }),
  ).toHaveText("Saved");
  await page
    .getByLabel("Category name", { exact: true })
    .fill(category + " renamed");
  await page
    .getByRole("button", { name: "Rename category", exact: true })
    .click();
  await expect(
    page.getByLabel("Page category", { exact: true }).locator("option:checked"),
  ).toHaveText(category + " renamed");
  await page.getByRole("button", { name: "Choose photo", exact: true }).click();
  await page
    .getByRole("button", { name: "Use photo " + photoName, exact: true })
    .click();
  await expect(
    page.getByRole("status", { name: "Page details status" }),
  ).toHaveText("Saved");
  fs.mkdirSync("work/ticket07-evidence", { recursive: true });
  await page.screenshot({
    path: "work/ticket07-evidence/" + testInfo.project.name + "-details.png",
    fullPage: true,
  });
  await page.reload();
  await page.getByRole("button", { name: "Page details", exact: true }).click();
  await expect(page.getByLabel("Page date", { exact: true })).toHaveValue(
    "2026-10-30",
  );
  await expect(
    page.getByLabel("Page category", { exact: true }).locator("option:checked"),
  ).toHaveText(category + " renamed");
  await expect(
    page.getByRole("img", { name: "Selected photo", exact: true }),
  ).toHaveAttribute("src", "/api/media/" + upload.id + "/display");
  await page
    .getByLabel("Page title", { exact: true })
    .fill("Independent title after details");
  await expect(
    page.getByRole("status", { name: "Auto-save status" }),
  ).toHaveText("Saved");
  await expect
    .poll(
      async () =>
        (await (await page.request.get("/api/pages/" + p.id)).json()).title,
    )
    .toBe("Independent title after details");
});
test("nested page grids select, order and filter pages in actual desktop and mobile canvases", async ({
  page,
  browser,
  baseURL,
  isMobile,
}, testInfo) => {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(env.TEST_ADMIN_EMAIL);
  await page
    .getByLabel("Password", { exact: true })
    .fill(env.TEST_ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/pages$/);
  const headers = { Origin: new URL(page.url()).origin },
    stamp = Date.now();
  const category = await (
    await page.request.post("/api/categories", {
      headers,
      data: { name: "Grid journey " + stamp },
    })
  ).json();
  const targets = [];
  for (const [index, visibility] of ["public", "private", "public"].entries()) {
    let p = await (
      await page.request.post("/api/pages", {
        headers,
        data: { title: "Grid story " + index + " " + stamp },
      })
    ).json();
    p = await (
      await page.request.patch("/api/pages/" + p.id + "/details", {
        headers,
        data: {
          date: "2026-10-30",
          categoryId: category.id,
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
    targets.push(p);
  }
  let source = await (
    await page.request.post("/api/pages", {
      headers,
      data: { title: "Grid canvas " + stamp },
    })
  ).json();
  source = await (
    await page.request.patch("/api/pages/" + source.id, {
      headers,
      data: {
        title: source.title,
        version: source.version,
        visibility: "public",
        content: {
          root: { props: {} },
          content: [
            {
              type: "Section",
              props: {
                id: "grid-section",
                content: [
                  {
                    type: "PageGrid",
                    props: {
                      id: "journey-grid",
                      selection: {
                        mode: "manual",
                        pageIds: [],
                        categoryId: "",
                      },
                      showDate: true,
                    },
                  },
                ],
              },
            },
          ],
        },
      },
    })
  ).json();
  await page.goto("/admin/pages/" + source.id);
  await page
    .getByRole("button", { name: "Select PageGrid 1", exact: true })
    .click();
  await page.getByRole("button", { name: "Open settings panel" }).click();
  for (const p of targets) {
    await page
      .getByLabel("Add page to grid", { exact: true })
      .selectOption(p.id);
    await page
      .getByRole("button", { name: "Add selected page", exact: true })
      .click();
  }
  await page
    .getByRole("button", { name: "Move page up 3", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Move page up 2", exact: true })
    .click();
  await expect(
    page.getByRole("status", { name: "Auto-save status" }),
  ).toHaveText("Saved");
  const canvas = page.frameLocator("iframe");
  await expect(canvas.getByRole("heading", { level: 3 })).toHaveText([
    targets[2].title,
    targets[0].title,
    targets[1].title,
  ]);
  await page.getByRole("button", { name: "Mobile", exact: true }).click();
  await expect
    .poll(async () =>
      canvas
        .locator(".garden-page-grid")
        .evaluate(
          (el) => getComputedStyle(el).gridTemplateColumns.split(" ").length,
        ),
    )
    .toBe(1);
  await page.getByRole("button", { name: "Desktop", exact: true }).click();
  await expect
    .poll(async () =>
      canvas
        .locator(".garden-page-grid")
        .evaluate(
          (el) => getComputedStyle(el).gridTemplateColumns.split(" ").length,
        ),
    )
    .toBe(3);
  if (isMobile)
    await page.getByRole("button", { name: "Mobile", exact: true }).click();
  const context = await browser.newContext({ viewport: page.viewportSize() });
  const visitor = await context.newPage();
  await visitor.goto(baseURL + "/garden/" + source.slug);
  await expect(visitor.locator(".garden-page-grid h3")).toHaveText([
    targets[2].title,
    targets[0].title,
  ]);
  await expect(
    visitor.getByText(targets[1].title, { exact: true }),
  ).toHaveCount(0);
  fs.mkdirSync("work/ticket07-evidence", { recursive: true });
  await visitor.screenshot({
    path:
      "work/ticket07-evidence/" + testInfo.project.name + "-public-grid.png",
    fullPage: true,
  });
  await page
    .getByLabel("Grid selection", { exact: true })
    .selectOption("category");
  await page
    .getByLabel("Grid category", { exact: true })
    .selectOption(category.id);
  await expect(
    page.getByRole("status", { name: "Auto-save status" }),
  ).toHaveText("Saved");
  await page.reload();
  await page
    .getByRole("button", { name: "Select PageGrid 1", exact: true })
    .click();
  await page.getByRole("button", { name: "Open settings panel" }).click();
  await expect(page.getByLabel("Grid selection", { exact: true })).toHaveValue(
    "category",
  );
  await expect(page.getByLabel("Grid category", { exact: true })).toHaveValue(
    category.id,
  );
  await visitor.reload();
  await expect(visitor.locator(".garden-page-grid h3")).toHaveCount(2);
  await context.close();
});
