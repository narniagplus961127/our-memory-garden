import { test, expect } from "@playwright/test";
import { mkdirSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import postgres from "postgres";
import sharp from "sharp";

const env = parseEnv(readFileSync(".env.test", "utf8"));
const base = process.env.PLAYWRIGHT_BASE_URL ?? env.NEXT_PUBLIC_APP_URL!;
const connection = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL!;
if (
  new URL(base).hostname !== "127.0.0.1" ||
  new URL(connection).hostname !== "127.0.0.1"
)
  throw Error("Card fixtures require isolated loopback services.");
mkdirSync("work/page-card-evidence", { recursive: true });

test("varied pixel plant backgrounds stay decorative, compact and within the public page", async ({
  page,
}, info) => {
  await page.goto("/garden?q=pixel-plant-preview-no-match");
  const main = page.locator("main.public-page");
  expect(
    await main.evaluate((el) => getComputedStyle(el, "::before").pointerEvents),
  ).toBe("none");
  const backgrounds = await main.evaluate(
    (el) => getComputedStyle(el, "::before").backgroundImage,
  );
  expect(backgrounds).toContain("garden-plants-pattern-v2.svg");
  expect(
    await main.evaluate(
      (el) => getComputedStyle(el, "::before").backgroundRepeat,
    ),
  ).toBe("repeat");
  expect(
    await main.evaluate((el) => Math.round(el.getBoundingClientRect().width)),
  ).toBe(await page.evaluate(() => innerWidth));
  const pattern = await page.request.get("/brand/garden-plants-pattern-v2.svg");
  expect(pattern.status()).toBe(200);
  const tile = await pattern.text();
  expect(Buffer.byteLength(tile)).toBeLessThan(160000);
  expect(tile.match(/width="112" height="112"/g)).toHaveLength(6);
  let bytes = 0;
  for (const name of [
    "garden-plant-fern-v1.webp",
    "garden-plant-snake-v1.webp",
    "garden-plant-monstera-v1.webp",
    "garden-plant-succulent-v1.webp",
    "garden-plant-cactus-v1.webp",
    "garden-plant-orchid-v1.webp",
  ]) {
    expect(tile).toContain(name);
    const response = await page.request.get("/brand/" + name);
    expect(response.status()).toBe(200);
    const body = await response.body();
    bytes += body.length;
    expect(body.length).toBeLessThan(25000);
    const image = await sharp(body).metadata();
    expect(image.hasAlpha).toBe(true);
    expect(image.width).toBe(224);
    expect(image.height).toBe(224);
  }
  expect(bytes).toBeLessThan(120000);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `work/page-card-evidence/plants-${info.project.name}.png`,
    animations: "disabled",
  });
});

test("wooden cards share descriptions across Garden, category and widget while desktop/tablet filters stay inline", async ({
  page,
  playwright,
  isMobile,
}, info) => {
  test.setTimeout(120000);
  page.setDefaultTimeout(15000);
  page.setDefaultNavigationTimeout(45000);
  const sql = postgres(connection, { max: 1, ssl: false });
  const admin = await playwright.request.newContext({
    baseURL: base,
    extraHTTPHeaders: { Origin: base },
  });
  const login = await admin.post("/api/auth/sign-in/email", {
    data: { email: env.TEST_ADMIN_EMAIL, password: env.TEST_ADMIN_PASSWORD },
  });
  expect(login.status()).toBe(200);
  const suffix = crypto.randomUUID().slice(0, 8),
    prefix = "Wooden " + suffix;
  const category = crypto.randomUUID(),
    categorySlug = "wooden-" + suffix;
  const photoBytes = await sharp({
    create: { width: 480, height: 320, channels: 3, background: "#759b83" },
  })
    .jpeg()
    .toBuffer();
  const start = await admin.post("/api/media/uploads", {
    data: {
      name: prefix + ".jpg",
      type: "image/jpeg",
      size: photoBytes.length,
    },
  });
  expect(start.status()).toBe(201);
  const upload = await start.json();
  expect(
    (
      await admin.put(upload.uploadUrl, {
        headers: { "Content-Type": "image/jpeg" },
        data: photoBytes,
      })
    ).ok(),
  ).toBeTruthy();
  expect(
    (await admin.post(`/api/media/${upload.id}/complete`, { data: {} })).ok(),
  ).toBeTruthy();
  const ids: string[] = [];
  const description =
    "一起走过的日子 · Our favourite memories. " + "阳光与我们。".repeat(60);
  const [owner] =
    await sql`select user_id from garden_administrators order by created_at limit 1`;
  try {
    await sql`insert into page_categories(id,name,slug,created_by) values(${category},${prefix},${categorySlug},${owner.user_id})`;
    async function seed(
      title: string,
      visibility: string,
      summary: string | null,
      cover: string | null,
      content?: postgres.JSONValue,
      deleted = false,
    ) {
      const id = crypto.randomUUID();
      ids.push(id);
      await sql`insert into pages(id,title,slug,visibility,page_date,category_ids,sharing_description,cover_photo_id,content,created_by,updated_by,deleted_at) values(${id},${title},${"wood-" + id},${visibility},${"2024-05-02"},${sql.array([category], 2950)}::uuid[],${summary},${cover}::uuid,${sql.json(content ?? { root: { props: {} }, content: [] })},${owner.user_id},${owner.user_id},${deleted ? new Date() : null})`;
      return id;
    }
    const covered = await seed(
      prefix + " 槟城小旅行 · Penang",
      "public",
      description,
      upload.id,
    );
    const paper = await seed(prefix + " Paper", "public", null, null);
    const literal = await seed(
      prefix + " Text",
      "public",
      "<script>window.cardScriptRan=true</script>",
      null,
    );
    const privateId = await seed(
      prefix + " Private",
      "private",
      "Hidden description " + suffix,
      null,
    );
    await seed(
      prefix + " Trash",
      "public",
      "Trashed description " + suffix,
      null,
      undefined,
      true,
    );
    const widget = await seed(prefix + " Widget", "public", null, null, {
      root: { props: {} },
      content: [
        {
          type: "Section",
          props: {
            id: "section",
            content: [
              {
                type: "PageGrid",
                props: {
                  id: "page-grid",
                  selection: {
                    mode: "manual",
                    pageIds: [covered, paper, literal, privateId],
                    categoryId: "",
                  },
                  showDate: true,
                },
              },
            ],
          },
        },
      ],
    });
    const expected = description.slice(0, 240);
    for (const selection of [
      { mode: "manual", pageIds: [covered, paper, privateId], categoryId: "" },
      { mode: "category", pageIds: [], categoryId: category },
    ]) {
      const response = await page.request.get(
        "/api/page-grid?selection=" +
          encodeURIComponent(JSON.stringify(selection)),
      );
      expect(response.status()).toBe(200);
      const cards = await response.json();
      expect(
        cards.find((card: { id: string }) => card.id === covered).description,
      ).toBe(expected);
      expect(cards.some((card: { id: string }) => card.id === privateId)).toBe(
        false,
      );
      expect(cards.every((card: object) => !("content" in card))).toBe(true);
    }
    const garden = `/garden?q=${encodeURIComponent(prefix)}&year=2024&category=${category}`;
    await page.goto(garden, { waitUntil: "domcontentloaded" });
    const form = page.getByRole("form", { name: "Garden filters" });
    for (const label of await form.locator("label").all()) {
      await expect(label).toHaveClass(/sr-only/);
      expect(
        await label.evaluate((el) => el.getBoundingClientRect().width),
      ).toBeLessThanOrEqual(1);
    }
    const viewports = isMobile ? [390] : [768, 1024, 1280];
    for (const width of viewports) {
      await page.setViewportSize({ width, height: isMobile ? 844 : 900 });
      const controls = [
        form.getByLabel("Find a memory"),
        form.getByLabel("Year", { exact: true }),
        form.getByLabel("Category", { exact: true }),
        form.getByRole("link", { name: "Clear filters", exact: true }),
      ];
      await expect(
        form.getByRole("button", { name: "Apply filters", exact: true }),
      ).toHaveCount(0);
      const boxes = await Promise.all(
        controls.map((control) => control.boundingBox()),
      );
      expect(boxes.every(Boolean)).toBe(true);
      if (width >= 768) {
        for (const box of boxes)
          expect(
            Math.abs(box!.y + box!.height - boxes[0]!.y - boxes[0]!.height),
          ).toBeLessThan(2);
        for (let i = 1; i < boxes.length; i++)
          expect(boxes[i]!.x).toBeGreaterThanOrEqual(
            boxes[i - 1]!.x + boxes[i - 1]!.width,
          );
      } else expect(boxes[3]!.y).toBeGreaterThan(boxes[2]!.y);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        animations: "disabled",
        path: `work/page-card-evidence/garden-${width}.png`,
      });
    }
    for (const path of [garden, "/category/" + categorySlug, "/p/" + widget]) {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      const card = page.locator(".garden-page-card").filter({
        has: page.getByRole("heading", {
          name: prefix + " 槟城小旅行 · Penang",
          exact: true,
        }),
      });
      await expect(card).toBeVisible();
      await expect(card.locator(".garden-card-description")).toHaveText(
        expected,
      );
      await expect(card.getByRole("link")).toHaveAttribute(
        "href",
        "/p/" + covered,
      );
      await expect(card.locator("time")).toHaveAttribute(
        "datetime",
        "2024-05-02",
      );
      await expect(card.locator("img")).toHaveAttribute(
        "srcset",
        /thumb-320 320w/,
      );
      expect(
        await card
          .locator(".garden-card-paper")
          .evaluate((el) => getComputedStyle(el, "::before").clipPath),
      ).toContain("polygon");
      await expect(card.locator(".garden-card-description")).toHaveCSS(
        "-webkit-line-clamp",
        "3",
      );
      await expect(
        page.locator(`.garden-page-card a[href="/p/${privateId}"]`),
      ).toHaveCount(0);
      expect(
        await page.evaluate(() =>
          Boolean(
            (window as typeof window & { cardScriptRan?: boolean })
              .cardScriptRan,
          ),
        ),
      ).toBe(false);
      const blank = page.locator(".garden-page-card").filter({
        has: page.getByRole("heading", {
          name: prefix + " Paper",
          exact: true,
        }),
      });
      await expect(blank.locator(".garden-card-cover")).toBeVisible();
      await expect(blank.locator(".garden-card-description")).toHaveCount(0);
      await card.getByRole("link").focus();
      await expect(card).toHaveCSS("outline-style", "solid");
      await card.screenshot({
        animations: "disabled",
        path: `work/page-card-evidence/card-${info.project.name}-${path === garden ? "garden" : path.startsWith("/category") ? "category" : "widget"}.png`,
      });
    }
  } finally {
    for (const id of ids.reverse()) await sql`delete from pages where id=${id}`;
    await sql`delete from page_categories where id=${category}`;
    await admin.delete(`/api/media/${upload.id}`, { data: { confirm: true } });
    await admin.dispose();
    await sql.end();
  }
});
