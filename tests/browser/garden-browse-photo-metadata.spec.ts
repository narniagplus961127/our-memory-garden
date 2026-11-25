import { test, expect, type Page } from "@playwright/test";
import { readFileSync, mkdirSync } from "node:fs";
import { parseEnv } from "node:util";
import postgres from "postgres";
import sharp from "sharp";
import { readGardenQuery } from "../../src/lib/garden-browse";
import { pageListHref } from "../../src/lib/page-list";
import { photoMetadata } from "../../src/lib/photo-metadata";
const env = parseEnv(readFileSync(".env.test", "utf8"));
const base = process.env.PLAYWRIGHT_BASE_URL ?? env.NEXT_PUBLIC_APP_URL!;
const headers = { Origin: base };
mkdirSync("work/garden-browse-evidence", { recursive: true });
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

test("browse and photo metadata input boundaries normalize safely", () => {
  const query = readGardenQuery({
    q: "  memory\0  ",
    year: "2024",
    category: "bad",
    page: "2",
  });
  expect(query).toEqual({
    page: 2,
    search: "memory",
    year: "2024",
    categoryId: "",
  });
  expect(
    readGardenQuery({ year: "2024-01-01", q: ["a", "b"], category: ["x"] })
      .year,
  ).toBe("");
  expect(
    pageListHref("/garden", 2, undefined, {
      q: "我们的旅行",
      year: "2024",
      category: "id",
    }),
  ).toContain("year=2024");
  expect(photoMetadata(" Beach ", [" Penang ", "PENANG", "黄昏"])).toEqual({
    name: "Beach",
    labels: ["Penang", "黄昏"],
  });
  for (const labels of [[""], ["x".repeat(41)], Array(21).fill("x"), ["x\0"]])
    expect(photoMetadata("photo", labels)).toBeNull();
});

test("Garden search and filters paginate public descendants without leaking hidden choices, and the fence stays responsive", async ({
  page,
}, info) => {
  test.setTimeout(150000);
  const connection =
    process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;
  if (
    !connection ||
    new URL(connection).hostname !== "127.0.0.1" ||
    new URL(base).hostname !== "127.0.0.1"
  )
    throw Error("Garden fixtures require loopback services.");
  const sql = postgres(connection, { max: 1, ssl: false });
  const suffix = crypto.randomUUID().slice(0, 8),
    prefix = "Browse " + suffix;
  const parent = crypto.randomUUID(),
    child = crypto.randomUUID(),
    hidden = crypto.randomUUID();
  const ids: string[] = [];
  const [admin] =
    await sql`select user_id from garden_administrators order by created_at limit 1`;
  const [settings] =
    await sql`select homepage_id from garden_settings where singleton=true`;
  try {
    for (const [id, name, parentId] of [
      [parent, "Places " + suffix, null],
      [child, "Penang " + suffix, parent],
      [hidden, "Hidden " + suffix, null],
    ])
      await sql`insert into page_categories(id,name,slug,parent_id,created_by) values(${id},${name},${"category-" + id},${parentId},${admin.user_id})`;
    async function seed(
      title: string,
      visibility: string,
      date: string,
      category: string,
      deleted = false,
    ) {
      const id = crypto.randomUUID();
      ids.push(id);
      await sql`insert into pages(id,title,slug,visibility,page_date,category_ids,created_by,updated_by,deleted_at) values(${id},${title},${"browse-" + id},${visibility},${date},${sql.array([category], 2950)}::uuid[],${admin.user_id},${admin.user_id},${deleted ? new Date() : null})`;
      return id;
    }
    for (let i = 0; i < 25; i++)
      await seed(
        prefix + " " + String(i).padStart(2, "0"),
        "public",
        "2024-05-02",
        child,
      );
    await seed(prefix + " Older", "public", "2023-05-02", child);
    const privateId = await seed(
      prefix + " Private",
      "private",
      "9876-01-01",
      hidden,
    );
    await seed(prefix + " Trash", "public", "9877-01-01", hidden, true);
    const home = await seed(prefix + " Home", "public", "2024-05-02", child);
    await sql`update garden_settings set homepage_id=${home} where singleton=true`;
    await page.goto("/garden", { waitUntil: "domcontentloaded" });
    const form = page.getByRole("form", { name: "Garden filters" });
    await expect(form).toBeVisible();
    await expect(
      form.getByLabel("Year", { exact: true }).locator('option[value="9876"]'),
    ).toHaveCount(0);
    await expect(
      form.getByLabel("Year", { exact: true }).locator('option[value="9877"]'),
    ).toHaveCount(0);
    await expect(
      form
        .getByLabel("Category", { exact: true })
        .locator(`option[value="${hidden}"]`),
    ).toHaveCount(0);
    await form.getByLabel("Find a memory").fill(prefix.toUpperCase());
    await form.getByLabel("Year", { exact: true }).selectOption("2024");
    await form.getByLabel("Category", { exact: true }).selectOption(parent);
    await form.getByRole("button", { name: "Apply filters" }).click();
    await expect(page).toHaveURL(
      (url) =>
        url.searchParams.get("q") === prefix.toUpperCase() &&
        url.searchParams.get("year") === "2024" &&
        url.searchParams.get("category") === parent,
    );
    await expect(page.locator(".garden-page-card")).toHaveCount(24);
    await expect(page.locator(".garden-page-card h3").first()).toContainText(
      prefix,
    );
    await expect(
      page.getByRole("heading", { name: prefix + " Home", exact: true }),
    ).toHaveCount(0);
    const next = page.getByRole("link", { name: "Next", exact: true });
    const href = new URL((await next.getAttribute("href"))!, base);
    expect(href.searchParams.get("q")).toBe(prefix.toUpperCase());
    expect(href.searchParams.get("year")).toBe("2024");
    expect(href.searchParams.get("category")).toBe(parent);
    await next.click();
    await expect(page).toHaveURL((url) => url.searchParams.get("page") === "2");
    await expect(page.locator(".garden-page-card")).toHaveCount(1);
    await expect(page.getByLabel("Find a memory")).toHaveValue(
      prefix.toUpperCase(),
    );
    await page.getByRole("link", { name: "Previous", exact: true }).click();
    await expect(page.locator(".garden-page-card")).toHaveCount(24);
    await page.goBack();
    await expect(page.locator(".garden-page-card")).toHaveCount(1);
    await page.getByLabel("Find a memory").fill("no-match-" + suffix);
    await page.getByRole("button", { name: "Apply filters" }).click();
    await expect(
      page.getByText(
        "No memories match these filters. Try another year, category or search.",
      ),
    ).toBeVisible();
    expect(new URL(page.url()).searchParams.has("page")).toBe(false);
    await page
      .getByRole("link", { name: "Clear filters", exact: true })
      .click();
    await expect(page.getByLabel("Find a memory")).toHaveValue("");
    const footer = page.locator(".garden-footer");
    await footer.scrollIntoViewIfNeeded();
    expect(await footer.evaluate((el) => getComputedStyle(el).textAlign)).toBe(
      "center",
    );
    await expect(page.locator(".garden-footer-fence")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    expect(
      await page
        .locator(".garden-footer-fence")
        .evaluate((el) => getComputedStyle(el).backgroundRepeat),
    ).toBe("no-repeat");
    const fenceBox = (await page
      .locator(".garden-footer-fence")
      .boundingBox())!;
    const footerBox = (await footer.boundingBox())!;
    expect(fenceBox.y + fenceBox.height).toBeLessThanOrEqual(footerBox.y + 1);
    const box = (await footer.locator("small").boundingBox())!;
    expect(
      Math.abs(box.x + box.width / 2 - page.viewportSize()!.width / 2),
    ).toBeLessThan(2);
    mkdirSync("work/garden-browse-evidence", { recursive: true });
    await page.screenshot({
      path: `work/garden-browse-evidence/footer-${info.project.name}.png`,
    });
    const asset = await page.request.get("/brand/footer-fence-v1.svg");
    expect(asset.ok()).toBeTruthy();
    expect((await asset.body()).length).toBeLessThan(6000);
    await login(page);
    await page.goto(
      `/garden?q=${encodeURIComponent(prefix)}&year=2024&category=${parent}`,
      { waitUntil: "domcontentloaded" },
    );
    await expect(page.locator(".garden-page-card")).toHaveCount(24);
    await expect(page.locator(`a[href="/p/${privateId}"]`)).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: prefix + " Home", exact: true }),
    ).toHaveCount(0);
  } finally {
    await sql`update garden_settings set homepage_id=${settings.homepage_id} where singleton=true`;
    await sql`delete from pages where id in ${sql(ids)}`;
    await sql`delete from page_categories where id in ${sql([child, parent, hidden])}`;
    await sql.end();
  }
});

test("wooden menu signs keep smaller child signs and disclosure navigation on desktop and mobile", async ({
  page,
}, info) => {
  test.setTimeout(90000);
  page.setDefaultTimeout(15000);
  expect(new URL(base).hostname).toBe("127.0.0.1");
  await login(page);
  const before = await (await page.request.get("/api/navigation")).json();
  const parent = crypto.randomUUID(),
    child = crypto.randomUUID();
  const changed = await page.request.put("/api/navigation", {
    headers,
    data: {
      version: before.version,
      items: [
        {
          id: parent,
          label: "我们的回忆 Memories",
          parentId: null,
          destination: { kind: "system", page: "garden" },
        },
        {
          id: child,
          label: "槟城 Penang",
          parentId: parent,
          destination: { kind: "external", url: "https://example.com/penang" },
          openInNewTab: true,
        },
      ],
    },
  });
  expect(changed.ok()).toBeTruthy();
  try {
    await page.goto("/garden", { waitUntil: "domcontentloaded" });
    const menu = page.getByRole("dialog");
    await expect(async () => {
      if (!(await menu.isVisible()))
        await page
          .getByRole("button", { name: "Open website menu", exact: true })
          .click();
      await expect(menu).toBeVisible({ timeout: 1000 });
    }).toPass({ timeout: 15000 });
    const parentLink = menu.getByRole("link", {
      name: "我们的回忆 Memories",
      exact: true,
    });
    const childLink = menu.getByRole("link", {
      name: "槟城 Penang",
      exact: true,
    });
    await parentLink.click();
    await expect(parentLink).toHaveAttribute("aria-expanded", "true");
    await expect(childLink).toBeVisible();
    expect((await parentLink.boundingBox())!.height).toBeGreaterThan(
      (await childLink.boundingBox())!.height,
    );
    await expect(childLink).toHaveAttribute("target", "_blank");
    expect(
      await parentLink.evaluate(
        (el) =>
          getComputedStyle(el.parentElement!, "::before").borderImageSource,
      ),
    ).toContain("menu-sign-v1.svg");
    expect(await menu.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: `work/garden-browse-evidence/menu-signs-${info.project.name}.png`,
    });
    await menu
      .getByRole("button", {
        name: "Submenu for 我们的回忆 Memories",
        exact: true,
      })
      .focus();
    await page.keyboard.press("Escape");
    await expect(parentLink).toHaveAttribute("aria-expanded", "false");
    await expect(menu).toBeVisible();
    await parentLink.click();
    await expect(parentLink).toHaveAttribute("aria-expanded", "true");
    await parentLink.click();
    await expect(menu).not.toBeVisible();
    await expect(page).toHaveURL(/\/garden$/);
    const shortMenu = await (await page.request.get("/api/navigation")).json();
    expect(
      (
        await page.request.put("/api/navigation", {
          headers,
          data: {
            version: shortMenu.version,
            items: [
              ...shortMenu.items,
              ...Array.from({ length: 14 }, (_, index) => ({
                id: crypto.randomUUID(),
                label: "Memory " + (index + 1),
                parentId: null,
                destination: { kind: "system", page: "garden" },
              })),
            ],
          },
        })
      ).ok(),
    ).toBeTruthy();
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(async () => {
      if (!(await menu.isVisible()))
        await page
          .getByRole("button", { name: "Open website menu", exact: true })
          .click();
      await expect(menu).toBeVisible({ timeout: 1000 });
    }).toPass({ timeout: 15000 });
    const menuBox = (await menu.boundingBox())!;
    expect(Math.round(menuBox.width)).toBe(page.viewportSize()!.width);
    expect(Math.round(menuBox.height)).toBe(page.viewportSize()!.height);
    const scrollArea = menu.getByRole("navigation", {
      name: "Main navigation",
    });
    expect(
      await scrollArea.evaluate((el) => el.scrollHeight > el.clientHeight),
    ).toBe(true);
    await menu
      .getByRole("link", { name: "Memory 14", exact: true })
      .scrollIntoViewIfNeeded();
    await expect(
      menu.getByRole("link", { name: "Memory 14", exact: true }),
    ).toBeInViewport();
    await expect(
      menu.getByRole("button", { name: "Close menu", exact: true }),
    ).toBeInViewport();
    await page.screenshot({
      path: `work/garden-browse-evidence/menu-long-${info.project.name}.png`,
    });
    await menu.getByRole("button", { name: "Close menu", exact: true }).click();
    await expect(menu).not.toBeVisible();
  } finally {
    const current = await (await page.request.get("/api/navigation")).json();
    expect(
      (
        await page.request.put("/api/navigation", {
          headers,
          data: { items: before.items, version: current.version },
        })
      ).ok(),
    ).toBeTruthy();
  }
});

test("photo names and labels save, search the library and retain drafts on concurrent changes", async ({
  page,
}, info) => {
  test.setTimeout(150000);
  await login(page);
  const suffix = crypto.randomUUID().slice(0, 8),
    original = "Original " + suffix + ".jpg",
    renamed = "槟城 sunset " + suffix,
    label = "Beach-" + suffix;
  const bytes = await sharp({
    create: { width: 48, height: 32, channels: 3, background: "#74916c" },
  })
    .jpeg()
    .toBuffer();
  const started = await page.request.post("/api/media/uploads", {
    headers,
    data: { name: original, size: bytes.length, type: "image/jpeg" },
  });
  expect(started.status()).toBe(201);
  const upload = await started.json();
  expect(
    (
      await page.request.put(upload.uploadUrl, {
        headers: { "Content-Type": "image/jpeg" },
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
  try {
    await page.goto("/admin/media", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("button", { name: "Refresh library", exact: true }),
    ).toBeEnabled();
    await page
      .getByRole("searchbox", { name: "Find a photo", exact: true })
      .fill(suffix);
    await page
      .getByRole("button", { name: "Photo details " + original, exact: true })
      .click();
    const dialog = page.getByRole("dialog", {
      name: "Photo details",
      exact: true,
    });
    await dialog.getByRole("tab", { name: "Organize", exact: true }).click();
    await dialog.getByLabel("Photo name", { exact: true }).fill(renamed);
    await dialog
      .getByLabel("Labels", { exact: true })
      .fill(`${label}, Penang, PENANG`);
    await dialog
      .getByRole("button", { name: "Save changes", exact: true })
      .click();
    await expect(
      dialog.getByRole("heading", { name: renamed, exact: true }),
    ).toBeVisible();
    const saved = await (
      await page.request.get(`/api/media/${upload.id}`)
    ).json();
    expect(saved.labels).toEqual([label, "Penang"]);
    expect(saved.metadataVersion).toBe(1);
    const other = await page.request.patch(`/api/media/${upload.id}`, {
      headers,
      data: {
        name: "Another name " + suffix,
        labels: [label],
        metadataVersion: 1,
      },
    });
    expect(other.ok()).toBeTruthy();
    await dialog
      .getByLabel("Photo name", { exact: true })
      .fill("My draft " + suffix);
    await dialog
      .getByRole("button", { name: "Save changes", exact: true })
      .click();
    await expect(dialog.getByRole("alert")).toContainText("changed elsewhere");
    await expect(dialog.getByLabel("Photo name", { exact: true })).toHaveValue(
      "My draft " + suffix,
    );
    await dialog
      .getByRole("button", { name: "Reload saved details", exact: true })
      .click();
    await expect(dialog.getByLabel("Photo name", { exact: true })).toHaveValue(
      "Another name " + suffix,
    );
    await dialog.getByRole("tab", { name: "Overview", exact: true }).click();
    await dialog.getByRole("tab", { name: "Organize", exact: true }).click();
    await expect(dialog.getByLabel("Labels", { exact: true })).toHaveValue(
      label,
    );
    await page.screenshot({
      path: `work/garden-browse-evidence/photo-organize-${info.project.name}.png`,
    });
    await dialog
      .getByRole("button", { name: "Close photo details", exact: true })
      .click();
    await page
      .getByRole("searchbox", { name: "Find a photo", exact: true })
      .fill(label.toUpperCase());
    await expect(
      page.getByRole("button", {
        name: "Photo details Another name " + suffix,
        exact: true,
      }),
    ).toBeVisible();
  } finally {
    await page.request.delete(`/api/media/${upload.id}`, {
      headers,
      data: { confirm: true },
    });
  }
});
