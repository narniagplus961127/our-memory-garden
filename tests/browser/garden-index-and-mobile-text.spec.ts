import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { selectBlock } from "./editor-controls";

const env = parseEnv(readFileSync(".env.test", "utf8"));
const headers = {
  Origin: process.env.PLAYWRIGHT_BASE_URL ?? env.NEXT_PUBLIC_APP_URL!,
};

async function signIn(page: Page) {
  const signedIn = await page.request.post("/api/auth/sign-in/email", {
    headers,
    data: {
      email: env.TEST_ADMIN_EMAIL,
      password: env.TEST_ADMIN_PASSWORD,
    },
  });
  expect(signedIn.ok()).toBeTruthy();
}

async function createPage(page: Page, label: string) {
  const title = label + " " + crypto.randomUUID().slice(0, 8);
  const created = await page.request.post("/api/pages", {
    headers,
    data: { title },
  });
  expect(created.status()).toBe(201);
  return created.json();
}

test("Text can be centred on mobile while keeping its desktop alignment", async ({
  page,
  browser,
  baseURL,
  isMobile,
}) => {
  await signIn(page);
  const memory = await createPage(page, "Mobile text");
  const text = "Keep the desktop alignment";
  const prepared = await page.request.patch("/api/pages/" + memory.id, {
    headers,
    data: {
      visibility: "public",
      version: memory.version,
      content: {
        root: { props: { showTitle: false } },
        content: [
          {
            type: "Section",
            props: {
              id: "fixture-section",
              content: [
                {
                  type: "Text",
                  props: {
                    id: "fixture-text",
                    style: "p",
                    align: "right",
                    text,
                    textRich: '<p style="text-align: right">' + text + "</p>",
                  },
                },
              ],
            },
          },
        ],
      },
    },
  });
  expect(prepared.status(), await prepared.text()).toBe(200);
  await page.goto("/admin/pages/" + memory.id);
  await selectBlock(page, "Select Text 1");
  if (isMobile)
    await page
      .getByRole("button", { name: "Open settings panel", exact: true })
      .click();
  const mobilePanel = page.locator('details[data-section="mobile"]');
  await mobilePanel
    .getByRole("combobox", { name: "Text alignment" })
    .selectOption({ label: "Centre" }, { timeout: 8000 });
  await expect(
    page.getByRole("status", { name: "Auto-save status" }),
  ).toHaveText("Saved");

  const close = page.getByRole("button", { name: "Close panel", exact: true });
  if (isMobile && (await close.isVisible())) await close.click();
  await page.getByRole("button", { name: "Mobile", exact: true }).click();
  await expect(page.frameLocator("iframe").locator(".garden-text")).toHaveCSS(
    "text-align",
    "center",
  );

  const visitor = await browser.newPage({
    baseURL,
    viewport: { width: 1100, height: 750 },
  });
  try {
    await visitor.goto("/garden/" + memory.slug);
    const paragraph = visitor.getByText(text, { exact: true });
    await expect(paragraph).toHaveCSS("text-align", "right");
    await visitor.setViewportSize({ width: 390, height: 750 });
    await expect(paragraph).toHaveCSS("text-align", "center");
  } finally {
    await visitor.close();
  }
});

test("the garden index uses the category grid and shows only public non-home pages", async ({
  page,
  browser,
  baseURL,
}) => {
  await signIn(page);
  await page.goto("/admin");
  const pages = await (await page.request.get("/api/pages")).json();
  const home = pages.find(
    (entry: { is_homepage: boolean }) => entry.is_homepage,
  );
  expect(home).toBeTruthy();

  const [publicPage, privatePage, trashed] = await Promise.all([
    createPage(page, "Listed memory"),
    createPage(page, "Private memory"),
    createPage(page, "Trashed memory"),
  ]);
  for (const entry of [publicPage, trashed]) {
    const published = await page.request.patch("/api/pages/" + entry.id, {
      headers,
      data: { visibility: "public", version: entry.version },
    });
    expect(published.status(), await published.text()).toBe(200);
    Object.assign(entry, await published.json());
  }
  const removed = await page.request.post(
    "/api/pages/" + trashed.id + "/trash",
    {
      headers,
      data: { confirm: true, action: "trash", version: trashed.version },
    },
  );
  expect(removed.status(), await removed.text()).toBe(200);

  const visitor = await browser.newPage({ baseURL });
  try {
    for (const session of [visitor, page]) {
      await session.goto("/garden");
      await expect(session).toHaveTitle("Garden · Our Memory Garden");
      const grid = session.getByRole("region", {
        name: "Page grid",
        exact: true,
      });
      await expect(
        grid.getByRole("link", { name: publicPage.title, exact: true }),
      ).toHaveAttribute("href", "/p/" + publicPage.id);
      for (const entry of [home, privatePage, trashed])
        await expect(grid.locator('a[href="/p/' + entry.id + '"]')).toHaveCount(
          0,
        );
    }
  } finally {
    await visitor.close();
  }
});
